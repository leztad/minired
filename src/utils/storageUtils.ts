/**
 * Asynchronous, high-performance IndexedDB storage adapter with transparent fallback to localStorage.
 * Prevents main-thread UI stuttering when saving large network audit snapshots, topology maps,
 * and OUI vendor dictionaries.
 */

const DB_NAME = 'RedMonitorStorage';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase | null> | null = null;

const getDB = async (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        console.warn('IndexedDB unavailable, falling back to localStorage');
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB initialization failed:', e);
      resolve(null);
    }
  });

  return dbInitPromise;
};

/**
 * Retrieve an item asynchronously from IndexedDB, falling back to localStorage if not found or on error.
 */
export async function asyncGetItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDB();
    if (db) {
      const result = await new Promise<T | undefined>((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        } catch (err) {
          reject(err);
        }
      });

      if (result !== undefined) {
        return result;
      }
    }
  } catch (err) {
    console.warn(`IndexedDB read error for key "${key}":`, err);
  }

  // Fallback to localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        try {
          return JSON.parse(stored);
        } catch {
          return stored as unknown as T;
        }
      }
    }
  } catch {}

  return defaultValue;
}

/**
 * Save an item asynchronously to IndexedDB (and replicate to localStorage as a safety copy for simple values).
 */
export async function asyncSetItem<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(value, key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch (err) {
          reject(err);
        }
      });
    }
  } catch (err) {
    console.warn(`IndexedDB write error for key "${key}":`, err);
  }

  // Also sync small values to localStorage for compatibility
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      // Don't overwhelm localStorage with >3MB strings
      if (serialized.length < 2 * 1024 * 1024) {
        window.localStorage.setItem(key, serialized);
      }
    }
  } catch {}
}

/**
 * Remove an item from both IndexedDB and localStorage.
 */
export async function asyncRemoveItem(key: string): Promise<void> {
  try {
    const db = await getDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch (err) {
          reject(err);
        }
      });
    }
  } catch {}

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {}
}
