/**
 * IndexedDB-based storage for Supabase auth tokens.
 * 
 * iOS PWAs aggressively clear localStorage, causing users to be logged out
 * when reopening the app from the home screen. IndexedDB is more persistent
 * on iOS and survives the storage clearing that affects localStorage.
 * 
 * Falls back to localStorage if IndexedDB is unavailable.
 */

const DB_NAME = 'supabase-auth-storage';
const STORE_NAME = 'auth';
const DB_VERSION = 1;

// If IndexedDB is corrupted or stuck (Safari can do this after updates), open/tx
// operations may hang forever. We must time out and fall back to localStorage.
const IDB_OPEN_TIMEOUT_MS = 1500;
const IDB_TX_TIMEOUT_MS = 1500;

let dbPromise: Promise<IDBDatabase> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`[idbAuthStorage] ${label} timed out after ${ms}ms`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const timeout = window.setTimeout(() => {
      // Allow future attempts to retry.
      dbPromise = null;
      settle(() => {
        try {
          // Fire-and-forget cleanup attempt.
          indexedDB.deleteDatabase(DB_NAME);
        } catch {
          // ignore
        }
        reject(new Error('[idbAuthStorage] openDB timeout'));
      });
    }, IDB_OPEN_TIMEOUT_MS);

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.warn('IndexedDB open failed, falling back to localStorage');
        dbPromise = null;
        clearTimeout(timeout);
        settle(() => reject(request.error));
      };
      
      request.onsuccess = () => {
        clearTimeout(timeout);
        settle(() => resolve(request.result));
      };

      request.onblocked = () => {
        // Don't reject immediately; allow timeout handler to decide.
        console.warn('[idbAuthStorage] IndexedDB open blocked');
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    } catch (e) {
      dbPromise = null;
      clearTimeout(timeout);
      settle(() => reject(e));
    }
  });
  
  // Also protect against any unexpected hang inside the promise.
  return withTimeout(dbPromise, IDB_OPEN_TIMEOUT_MS + 250, 'openDB');
}

async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return await withTimeout(
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      }),
      IDB_TX_TIMEOUT_MS,
      'idbGet'
    );
  } catch {
    // Fallback to localStorage
    return localStorage.getItem(key);
  }
}

async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      IDB_TX_TIMEOUT_MS,
      'idbSet'
    );
    return;
  } catch {
    // Fallback to localStorage
    localStorage.setItem(key, value);
  }
}

async function idbRemove(key: string): Promise<void> {
  try {
    const db = await openDB();
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      IDB_TX_TIMEOUT_MS,
      'idbRemove'
    );
    return;
  } catch {
    // Fallback to localStorage
    localStorage.removeItem(key);
  }
}

/**
 * Custom storage adapter for Supabase that uses IndexedDB for better
 * persistence on iOS PWAs. Falls back to localStorage if IndexedDB fails.
 */
export const idbAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const value = await idbGet(key);
    // Also check localStorage for migration from old sessions
    if (value === null) {
      const lsValue = localStorage.getItem(key);
      if (lsValue) {
        // Migrate to IndexedDB
        await idbSet(key, lsValue);
        return lsValue;
      }
    }
    return value;
  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    await idbSet(key, value);
    // Also set in localStorage as backup
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore localStorage errors
    }
  },
  
  removeItem: async (key: string): Promise<void> => {
    await idbRemove(key);
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore localStorage errors
    }
  },
};
