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

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.warn('IndexedDB open failed, falling back to localStorage');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    } catch (e) {
      reject(e);
    }
  });
  
  return dbPromise;
}

async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch {
    // Fallback to localStorage
    return localStorage.getItem(key);
  }
}

async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback to localStorage
    localStorage.setItem(key, value);
  }
}

async function idbRemove(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
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
