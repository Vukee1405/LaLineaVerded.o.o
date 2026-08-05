import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { EntryForm } from './components/EntryForm';
import { HistoryList } from './components/HistoryList';
import { MonthlyOverview } from './components/MonthlyOverview';
import { InstallPrompt } from './components/InstallPrompt';
import { QrModal } from './components/QrModal';
import { BalaEntry, VrstaBale } from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [operatorName, setOperatorName] = useState<string | null>(() => {
    return localStorage.getItem('llv_operator_name');
  });

  const [isQrOpen, setIsQrOpen] = useState(false);

  const [currentView, setCurrentViewState] = useState<'home' | 'new-entry' | 'history' | 'monthly'>(() => {
    try {
      const saved = localStorage.getItem('llv_current_view');
      if (saved && ['home', 'new-entry', 'history', 'monthly'].includes(saved)) {
        return saved as 'home' | 'new-entry' | 'history' | 'monthly';
      }
    } catch (e) {}
    return 'home';
  });

  const setCurrentView = (view: 'home' | 'new-entry' | 'history' | 'monthly') => {
    try {
      localStorage.setItem('llv_current_view', view);
    } catch (e) {}
    setCurrentViewState(view);
  };
  const [entries, setEntries] = useState<BalaEntry[]>(() => {
    try {
      const cached = localStorage.getItem('llv_entries_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<BalaEntry | null>(null);

  // Sync local entries with Express server and fetch master list
  const fetchEntries = async () => {
    // Read local cache, pending sync items, and pending deletes
    let localCache: BalaEntry[] = [];
    try {
      const cached = localStorage.getItem('llv_entries_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) localCache = parsed;
      }
    } catch (e) {}

    let pendingSync: BalaEntry[] = [];
    try {
      const pending = localStorage.getItem('llv_pending_sync');
      if (pending) {
        const parsed = JSON.parse(pending);
        if (Array.isArray(parsed)) pendingSync = parsed;
      }
    } catch (e) {}

    let deletedIds = new Set<string>();
    try {
      const delRaw = localStorage.getItem('llv_deleted_ids');
      if (delRaw) {
        const parsed = JSON.parse(delRaw);
        if (Array.isArray(parsed)) deletedIds = new Set(parsed);
      }
    } catch (e) {}

    // Exclude deleted items from pendingSync and localCache
    pendingSync = pendingSync.filter(p => p && p.id && !deletedIds.has(p.id));
    localCache = localCache.filter(e => e && e.id && !deletedIds.has(e.id));

    try {
      // 1. Fetch current server entries
      const response = await fetch(`/api/entries?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
      });
      
      let serverEntries: BalaEntry[] = [];
      if (response.ok) {
        const responseText = await response.text();
        try {
          serverEntries = responseText ? JSON.parse(responseText) : [];
        } catch (e) {
          serverEntries = [];
        }
      }

      // Filter out deleted IDs from server entries
      serverEntries = serverEntries.filter(e => e && e.id && !deletedIds.has(e.id));

      // 2. If there are pending local creations/edits, push ONLY pendingSync items to server
      if (pendingSync.length > 0) {
        try {
          const syncRes = await fetch('/api/entries/sync', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ entries: pendingSync })
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (Array.isArray(syncData)) {
              const cleaned = syncData.filter(e => e && e.id && !deletedIds.has(e.id));
              setEntries(cleaned);
              localStorage.setItem('llv_entries_cache', JSON.stringify(cleaned));
              localStorage.removeItem('llv_pending_sync');
              setError(null);
              return;
            }
          }
        } catch (syncErr) {
          console.warn('Sync post failed, will retry on next check:', syncErr);
        }
      }

      // Master list merges serverEntries and pendingSync (localCache is for offline fallback only)
      const entryMap = new Map<string, BalaEntry>();
      serverEntries.forEach((item) => {
        if (item && item.id && !deletedIds.has(item.id)) entryMap.set(item.id, item);
      });
      pendingSync.forEach((item) => {
        if (item && item.id && !deletedIds.has(item.id)) entryMap.set(item.id, item);
      });

      const masterList = Array.from(entryMap.values()).sort((a, b) => {
        const dateComp = b.datum.localeCompare(a.datum);
        if (dateComp !== 0) return dateComp;
        return (b.vremeUnosa || '').localeCompare(a.vremeUnosa || '');
      });

      setEntries(masterList);
      localStorage.setItem('llv_entries_cache', JSON.stringify(masterList));
      setError(null);
    } catch (err: any) {
      console.warn('Network fetch failed, serving from local cache:', err);
      setEntries(localCache);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Set up entries fetch, online listeners, periodic polling, and real-time SSE sync
  useEffect(() => {
    fetchEntries();

    const handleOnline = () => {
      fetchEntries();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchEntries();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    // Periodic poll every 4s to ensure Director & Operators see all updates seamlessly
    const pollInterval = setInterval(() => {
      fetchEntries();
    }, 4000);

    // Setup SSE connection safely for real-time director/operator updates
    let eventSource: EventSource | null = null;
    let timerId: any = null;
    
    const connectSSE = () => {
      try {
        const sseUrl = new URL('/api/realtime', window.location.origin).toString();
        eventSource = new EventSource(sseUrl);
        
        eventSource.onmessage = (event) => {
          if (event.data === 'update') {
            fetchEntries();
          }
        };

        eventSource.onerror = (err) => {
          eventSource?.close();
          timerId = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.error('Failed to initialize SSE:', err);
      }
    };

    connectSSE();

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timerId) clearTimeout(timerId);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const handleLoginSuccess = (name: string) => {
    localStorage.setItem('llv_operator_name', name);
    setOperatorName(name);
    fetchEntries();
  };

  const handleLogout = () => {
    localStorage.removeItem('llv_operator_name');
    localStorage.removeItem('llv_current_view');
    localStorage.removeItem('llv_entry_form_draft');
    setOperatorName(null);
    setCurrentView('home');
  };

  // Add / Edit Entry Save Handler with Instant Optimistic Save & Background Sync
  const handleSaveEntry = async (entryData: {
    id?: string;
    datum: string;
    vrsta: VrstaBale;
    tezina: number;
    napomena: string;
  }) => {
    const isEditing = !!entryData.id;
    const entryId = entryData.id || Math.random().toString(36).substring(2, 11);
    const url = isEditing ? `/api/entries/${entryId}` : '/api/entries';
    const method = isEditing ? 'PUT' : 'POST';

    const newOrUpdatedEntry: BalaEntry = {
      id: entryId,
      datum: entryData.datum,
      vrsta: entryData.vrsta,
      tezina: entryData.tezina,
      napomena: entryData.napomena || 'Standardna bala',
      korisnik: operatorName || 'Operater',
      vremeUnosa: new Date().toISOString()
    };

    // 1. Instantly update React state and LocalStorage (0ms delay)
    setEntries((prev) => {
      let updated: BalaEntry[];
      if (isEditing) {
        updated = prev.map((item) => item.id === entryId ? newOrUpdatedEntry : item);
      } else {
        updated = [newOrUpdatedEntry, ...prev];
      }
      try {
        localStorage.setItem('llv_entries_cache', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. Queue into pending sync
    try {
      const pendingRaw = localStorage.getItem('llv_pending_sync');
      const pendingArr: BalaEntry[] = pendingRaw ? JSON.parse(pendingRaw) : [];
      const existingIdx = pendingArr.findIndex(p => p.id === entryId);
      if (existingIdx >= 0) {
        pendingArr[existingIdx] = newOrUpdatedEntry;
      } else {
        pendingArr.push(newOrUpdatedEntry);
      }
      localStorage.setItem('llv_pending_sync', JSON.stringify(pendingArr));
    } catch (e) {}

    // 3. Switch back to home view immediately
    setEditingEntry(null);
    setCurrentView('home');

    // 4. Send to server in background
    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(newOrUpdatedEntry),
      });

      if (response.ok) {
        try {
          const pendingRaw = localStorage.getItem('llv_pending_sync');
          if (pendingRaw) {
            const pendingArr: BalaEntry[] = JSON.parse(pendingRaw);
            const filtered = pendingArr.filter(p => p.id !== entryId);
            localStorage.setItem('llv_pending_sync', JSON.stringify(filtered));
          }
        } catch (e) {}
        await fetchEntries();
      }
    } catch (err) {
      console.warn('Background save error, entry remains safe in pending sync:', err);
    }
  };

  // Delete Entry Handler
  const handleDeleteEntry = async (id: string) => {
    // 1. Mark as deleted in localStorage so sync/polling never resurrects it
    try {
      const delRaw = localStorage.getItem('llv_deleted_ids');
      const delArr: string[] = delRaw ? JSON.parse(delRaw) : [];
      if (!delArr.includes(id)) {
        delArr.push(id);
      }
      localStorage.setItem('llv_deleted_ids', JSON.stringify(delArr));

      // Remove from pending sync list if it was queued
      const pendingRaw = localStorage.getItem('llv_pending_sync');
      if (pendingRaw) {
        const pendingArr: BalaEntry[] = JSON.parse(pendingRaw);
        const filtered = pendingArr.filter(p => p.id !== id);
        localStorage.setItem('llv_pending_sync', JSON.stringify(filtered));
      }
    } catch (e) {}

    // 2. Instantly update UI and local cache
    setEntries((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('llv_entries_cache', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 3. Send DELETE request to central server
    try {
      const response = await fetch(`/api/entries/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok || response.status === 404) {
        // Clear from deleted_ids once server acknowledges deletion
        try {
          const delRaw = localStorage.getItem('llv_deleted_ids');
          if (delRaw) {
            const delArr: string[] = JSON.parse(delRaw);
            const filtered = delArr.filter(dId => dId !== id);
            localStorage.setItem('llv_deleted_ids', JSON.stringify(filtered));
          }
        } catch (e) {}
        await fetchEntries();
      }
    } catch (err) {
      console.warn('Network delete error, item remains safely removed locally:', err);
    }
  };

  const handleEditEntryClick = (entry: BalaEntry) => {
    setEditingEntry(entry);
    setCurrentView('new-entry');
  };

  // Render current view
  const renderView = () => {
    if (loading && entries.length === 0) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <RefreshCw className="w-10 h-10 text-[#1b4332] animate-spin mb-4" />
          <p className="text-gray-500 font-extrabold text-sm uppercase tracking-wider">Ucitavanje podataka u toku...</p>
        </div>
      );
    }

    switch (currentView) {
      case 'home':
        return (
          <Dashboard
            entries={entries}
            onRefresh={fetchEntries}
            onNavigate={(view) => {
              if (view === 'new-entry') setEditingEntry(null);
              setCurrentView(view);
            }}
          />
        );
      case 'new-entry':
        return (
          <EntryForm
            editingEntry={editingEntry}
            operatorName={operatorName || 'Operater'}
            onSave={handleSaveEntry}
            onCancel={() => {
              setEditingEntry(null);
              setCurrentView('home');
            }}
          />
        );
      case 'history':
        return (
          <HistoryList
            entries={entries}
            onEdit={handleEditEntryClick}
            onDelete={handleDeleteEntry}
            onBack={() => setCurrentView('home')}
          />
        );
      case 'monthly':
        return (
          <MonthlyOverview
            entries={entries}
            onBack={() => setCurrentView('home')}
          />
        );
      default:
        return (
          <Dashboard
            entries={entries}
            onNavigate={setCurrentView}
          />
        );
    }
  };

  // If not logged in, show login page
  if (!operatorName) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24 relative">
      <Header 
        operatorName={operatorName} 
        onLogout={handleLogout} 
        onRefresh={fetchEntries}
        onOpenQr={() => setIsQrOpen(true)}
      />

      {/* Persistent Connection Status Warning (Non-intrusive) */}
      {error && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 text-xs md:text-sm font-bold text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchEntries} className="underline text-amber-900 ml-2">Ponovo povezi</button>
        </div>
      )}

      {/* Main Screen Content */}
      <main className="flex-1">
        {renderView()}
      </main>

      {/* PWA Install prompt toast */}
      <InstallPrompt />

      {/* QR Code Modal for Mobile Sharing */}
      <QrModal isOpen={isQrOpen} onClose={() => setIsQrOpen(false)} />
    </div>
  );
}
