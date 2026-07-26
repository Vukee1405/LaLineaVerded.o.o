import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure database file and directory exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
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

const readDB = (): BalaEntry[] => {
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
  writeDB(initialData);
  return initialData;
};

const writeDB = (data: BalaEntry[]) => {
  memoryEntriesCache = data;

  try {
    fs.writeFileSync(path.join('/tmp', 'lalinea_db.json'), JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing to /tmp/lalinea_db.json:', e);
  }

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing to ./data/db.json:', e);
  }

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
      // Ignore write errors, they will be removed on close
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
  
  // Accept any operator login with name
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
app.get('/api/entries', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const entries = readDB();
  const sorted = entries.sort((a, b) => {
    const dateComp = b.datum.localeCompare(a.datum);
    if (dateComp !== 0) return dateComp;
    return (b.vremeUnosa || '').localeCompare(a.vremeUnosa || '');
  });
  res.json(sorted);
});

// Batch sync endpoint for offline/client entries
app.post('/api/entries/sync', (req, res) => {
  const clientEntries = req.body.entries;
  if (!Array.isArray(clientEntries)) {
    return res.status(400).json({ error: 'Nevaljali format za sinhronizaciju' });
  }

  const currentDb = readDB();
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
    writeDB(currentDb);
  }

  const sorted = currentDb.sort((a, b) => {
    const dateComp = b.datum.localeCompare(a.datum);
    if (dateComp !== 0) return dateComp;
    return (b.vremeUnosa || '').localeCompare(a.vremeUnosa || '');
  });

  res.json(sorted);
});

// Create entry
app.post('/api/entries', (req, res) => {
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

  const entries = readDB();
  const existingIndex = entries.findIndex(e => e.id === newEntry.id);
  if (existingIndex >= 0) {
    entries[existingIndex] = newEntry;
  } else {
    entries.push(newEntry);
  }

  writeDB(entries);

  res.status(201).json(newEntry);
});

// Edit entry
app.put('/api/entries/:id', (req, res) => {
  const { id } = req.params;
  const { datum, vrsta, tezina, napomena, korisnik } = req.body;

  let entries = readDB();
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
  
  // Keep same vremeUnosa or update it? Keep same to preserve original timestamp, but we can log change time in a real system.

  writeDB(entries);
  res.json(entries[index]);
});

// Delete entry
app.delete('/api/entries/:id', (req, res) => {
  const { id } = req.params;
  const entries = readDB();
  const filtered = entries.filter(e => e.id !== id);
  
  if (filtered.length === entries.length) {
    return res.status(404).json({ error: 'Unos nije pronadjen' });
  }

  writeDB(filtered);
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

