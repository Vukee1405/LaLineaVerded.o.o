import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Redis } from '@upstash/redis';
import pg from 'pg';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Cloud Database clients (Vercel KV / Upstash Redis or Vercel Postgres / Neon)
let redisClient: Redis | null = null;
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
if (kvUrl && kvToken) {
  try {
    redisClient = new Redis({ url: kvUrl, token: kvToken });
  } catch (e) {
    console.warn('Failed to initialize Redis client:', e);
  }
}

let pgPool: pg.Pool | null = null;
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;
if (dbUrl) {
  try {
    pgPool = new pg.Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 5000,
    });
  } catch (e) {
    console.warn('Failed to initialize Postgres pool:', e);
  }
}

// Global Cloud Storage Fallback (JsonBlob) for zero-config cross-device sync
let cloudBlobUrl = process.env.CLOUD_BLOB_URL || 'https://jsonblob.com/api/jsonBlob/1332408976214552576';

const readCloudFallback = async (): Promise<BalaEntry[] | null> => {
  try {
    const res = await fetch(cloudBlobUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Cloud JsonBlob read error:', e);
  }
  return null;
};

const writeCloudFallback = async (data: BalaEntry[]): Promise<void> => {
  try {
    const res = await fetch(cloudBlobUrl, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      const postRes = await fetch('https://jsonblob.com/api/jsonBlob', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(5000)
      });
      if (postRes.ok && postRes.headers.get('Location')) {
        cloudBlobUrl = postRes.headers.get('Location')!;
      }
    }
  } catch (e) {
    console.warn('Cloud JsonBlob write error:', e);
  }
};

// Ensure database file and directory exist locally
if (!fs.existsSync(DB_DIR)) {
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
  } catch (e) {}
}

interface BalaEntry {
  id: string;
  datum: string;
  vrsta: 'cista' | 'primese';
  tezina: number;
  napomena: string;
  korisnik: string;
  vremeUnosa: string;
}

// Initial seed data for demo purposes if empty
const getInitialData = (): BalaEntry[] => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  
  return [
    {
      id: "seed-1",
      datum: `${currentYear}-${currentMonth}-02`,
      vrsta: "cista",
      tezina: 180,
      napomena: "Standardna bala",
      korisnik: "Zoran",
      vremeUnosa: new Date(`${currentYear}-${currentMonth}-02T09:30:00Z`).toISOString()
    },
    {
      id: "seed-2",
      datum: `${currentYear}-${currentMonth}-03`,
      vrsta: "primese",
      tezina: 120,
      napomena: "Vlazna bala",
      korisnik: "Marko",
      vremeUnosa: new Date(`${currentYear}-${currentMonth}-03T11:45:00Z`).toISOString()
    },
    {
      id: "seed-3",
      datum: `${currentYear}-${currentMonth}-05`,
      vrsta: "cista",
      tezina: 210,
      napomena: "Kvalitetna folija",
      korisnik: "Zoran",
      vremeUnosa: new Date(`${currentYear}-${currentMonth}-05T14:15:00Z`).toISOString()
    },
    {
      id: "seed-4",
      datum: `${currentYear}-${currentMonth}-08`,
      vrsta: "cista",
      tezina: 195,
      napomena: "Standardna bala",
      korisnik: "Dragan",
      vremeUnosa: new Date(`${currentYear}-${currentMonth}-08T10:00:00Z`).toISOString()
    },
    {
      id: "seed-5",
      datum: `${currentYear}-${currentMonth}-10`,
      vrsta: "primese",
      tezina: 145,
      napomena: "Ostecena folija",
      korisnik: "Marko",
      vremeUnosa: new Date(`${currentYear}-${currentMonth}-10T15:30:00Z`).toISOString()
    },
    {
      id: "seed-6",
      datum: `${currentYear}-${currentMonth}-12`,
      vrsta: "cista",
      tezina: 220,
      napomena: "Standardna bala",
      korisnik: "Dragan",
      vremeUnosa: new Date(`${currentYear}-${currentMonth}-12T11:20:00Z`).toISOString()
    },
    {
      id: "seed-7",
      datum: `${currentYear}-${currentMonth}-15`,
      vrsta: "primese",
      tezina: 110,
      napomena: "Ostalo",
      korisnik: "Zoran",
      vremeUnosa: new Date(`${currentYear}-${currentMonth}-15T09:10:00Z`).toISOString()
    },
    {
      id: "seed-8",
      datum: `${currentYear}-${currentMonth}-18`,
      vrsta: "cista",
      tezina: 205,
      napomena: "Standardna bala",
      korisnik: "Marko",
      vremeUnosa: new Date(`${currentYear}-${currentMonth}-18T13:40:00Z`).toISOString()
    }
  ];
};

let memoryEntriesCache: BalaEntry[] | null = null;

const readDB = async (): Promise<BalaEntry[]> => {
  // 1. Try Vercel KV / Upstash Redis
  if (redisClient) {
    try {
      const data = await redisClient.get<BalaEntry[]>('bale_entries');
      if (Array.isArray(data)) {
        memoryEntriesCache = data;
        return data;
      }
    } catch (e) {
      console.warn('Vercel KV read error:', e);
    }
  }

  // 2. Try Vercel Postgres / Neon
  if (pgPool) {
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS bale_store (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL
        )
      `);
      const res = await pgPool.query(`SELECT value FROM bale_store WHERE key = 'bale_entries'`);
      if (res.rows.length > 0 && Array.isArray(res.rows[0].value)) {
        memoryEntriesCache = res.rows[0].value;
        return res.rows[0].value;
      }
    } catch (e) {
      console.warn('Postgres read error:', e);
    }
  }

  // 3. Try Cloud Storage Fallback (JsonBlob)
  const cloudData = await readCloudFallback();
  if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
    memoryEntriesCache = cloudData;
    return cloudData;
  }

  // 4. Fallback to memory cache or local filesystem
  if (memoryEntriesCache !== null) {
    return memoryEntriesCache;
  }

  try {
    const tmpFile = path.join('/tmp', 'lalinea_db.json');
    if (fs.existsSync(tmpFile)) {
      const content = fs.readFileSync(tmpFile, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        memoryEntriesCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading /tmp/lalinea_db.json:', e);
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        memoryEntriesCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading ./data/db.json:', e);
  }

  const initialData = getInitialData();
  memoryEntriesCache = initialData;
  await writeDB(initialData);
  return initialData;
};

const writeDB = async (data: BalaEntry[]): Promise<void> => {
  memoryEntriesCache = data;

  // 1. Write to Vercel KV / Upstash Redis
  if (redisClient) {
    try {
      await redisClient.set('bale_entries', data);
    } catch (e) {
      console.error('Vercel KV write error:', e);
    }
  }

  // 2. Write to Vercel Postgres / Neon
  if (pgPool) {
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS bale_store (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL
        )
      `);
      await pgPool.query(
        `INSERT INTO bale_store (key, value) VALUES ('bale_entries', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [JSON.stringify(data)]
      );
    } catch (e) {
      console.error('Postgres write error:', e);
    }
  }

  // 3. Write to Cloud Storage Fallback (JsonBlob)
  await writeCloudFallback(data);

  // 4. Local disk fallback
  try {
    fs.writeFileSync(path.join('/tmp', 'lalinea_db.json'), JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}

  notifyClients();
};

// SSE Clients registration
let sseClients: any[] = [];

const notifyClients = () => {
  const message = `data: update\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (e) {
      // Ignore write errors
    }
  });
};

app.use(express.json());

// CORS Middleware for cross-device & cross-origin compatibility
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Cache-Control, Pragma');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API Endpoints
// Auth endpoint
app.post('/api/auth/login', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { name } = req.body || {};
  if (!name || String(name).trim().length === 0) {
    return res.status(400).json({ error: 'Ime operatera je obavezno' });
  }
  
  return res.json({ name: String(name).trim(), role: 'operator' });
});

// SSE event source for real-time synchronization
app.get('/api/realtime', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

// Get all entries
app.get('/api/entries', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const entries = await readDB();
  const sorted = entries.sort((a, b) => {
    const dateComp = b.datum.localeCompare(a.datum);
    if (dateComp !== 0) return dateComp;
    return (b.vremeUnosa || '').localeCompare(a.vremeUnosa || '');
  });
  res.json(sorted);
});

// Batch sync endpoint for offline/client entries
app.post('/api/entries/sync', async (req, res) => {
  const clientEntries = req.body.entries;
  if (!Array.isArray(clientEntries)) {
    return res.status(400).json({ error: 'Nevaljali format za sinhronizaciju' });
  }

  const currentDb = await readDB();
  let modified = false;

  clientEntries.forEach((item: BalaEntry) => {
    if (!item || !item.datum || !item.vrsta || !item.tezina) return;
    
    const existingIndex = currentDb.findIndex(e => e.id === item.id);
    const weight = Number(item.tezina);
    if (isNaN(weight) || weight <= 0) return;

    const sanitizedEntry: BalaEntry = {
      id: item.id || Math.random().toString(36).substring(2, 11),
      datum: String(item.datum),
      vrsta: item.vrsta === 'primese' ? 'primese' : 'cista',
      tezina: weight,
      napomena: String(item.napomena || ''),
      korisnik: String(item.korisnik || 'Operater'),
      vremeUnosa: item.vremeUnosa || new Date().toISOString()
    };

    if (existingIndex >= 0) {
      currentDb[existingIndex] = sanitizedEntry;
    } else {
      currentDb.push(sanitizedEntry);
    }
    modified = true;
  });

  if (modified) {
    await writeDB(currentDb);
  }

  const sorted = currentDb.sort((a, b) => {
    const dateComp = b.datum.localeCompare(a.datum);
    if (dateComp !== 0) return dateComp;
    return (b.vremeUnosa || '').localeCompare(a.vremeUnosa || '');
  });

  res.json(sorted);
});

// Create entry
app.post('/api/entries', async (req, res) => {
  const { id, datum, vrsta, tezina, napomena, korisnik, vremeUnosa } = req.body;
  
  if (!datum || !vrsta || !tezina) {
    return res.status(400).json({ error: 'Nedostaju obavezni podaci za unos' });
  }

  const weight = Number(tezina);
  if (isNaN(weight) || weight <= 0) {
    return res.status(400).json({ error: 'Tezina mora biti pozitivan broj' });
  }

  const newEntry: BalaEntry = {
    id: id || Math.random().toString(36).substring(2, 11),
    datum,
    vrsta,
    tezina: weight,
    napomena: napomena || '',
    korisnik: korisnik || 'Operater',
    vremeUnosa: vremeUnosa || new Date().toISOString()
  };

  const entries = await readDB();
  const existingIndex = entries.findIndex(e => e.id === newEntry.id);
  if (existingIndex >= 0) {
    entries[existingIndex] = newEntry;
  } else {
    entries.push(newEntry);
  }

  await writeDB(entries);

  res.status(201).json(newEntry);
});

// Edit entry
app.put('/api/entries/:id', async (req, res) => {
  const { id } = req.params;
  const { datum, vrsta, tezina, napomena, korisnik } = req.body;

  let entries = await readDB();
  const index = entries.findIndex(e => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Unos nije pronadjen' });
  }

  if (tezina !== undefined) {
    const weight = Number(tezina);
    if (isNaN(weight) || weight <= 0) {
      return res.status(400).json({ error: 'Tezina mora biti pozitivan broj' });
    }
    entries[index].tezina = weight;
  }

  if (datum) entries[index].datum = datum;
  if (vrsta) entries[index].vrsta = vrsta;
  if (napomena !== undefined) entries[index].napomena = napomena;
  if (korisnik) entries[index].korisnik = korisnik;

  await writeDB(entries);
  res.json(entries[index]);
});

// Delete entry
app.delete('/api/entries/:id', async (req, res) => {
  const { id } = req.params;
  const entries = await readDB();
  const filtered = entries.filter(e => e.id !== id);
  
  if (filtered.length === entries.length) {
    return res.status(404).json({ error: 'Unos nije pronadjen' });
  }

  await writeDB(filtered);
  res.json({ success: true, id });
});

async function startServer() {
  // Vite dev server middleware integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Serve production static assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

// Only call startServer directly when running standalone (not imported as a module)
if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;

