const DB_NAME = 'trading-journal-db';
const DB_VERSION = 1;
const STORE_NAMES = ['trades', 'settings', 'backups'] as const;

export type StoreName = typeof STORE_NAMES[number];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
    };
  });
}

export async function idbGet<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as T | undefined);
  });
}

export async function idbSet<T>(storeName: StoreName, key: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function idbDelete(storeName: StoreName, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function idbGetAll<T>(storeName: StoreName): Promise<{ key: string; value: T }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const results: { key: string; value: T }[] = [];
    const request = store.openCursor();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        results.push({ key: String(cursor.key), value: cursor.value as T });
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
}

export async function migrateFromLocalStorage(): Promise<boolean> {
  const key = 'trading-journal-trades';
  const stored = localStorage.getItem(key);
  if (!stored) return false;

  try {
    const trades = JSON.parse(stored);
    if (Array.isArray(trades) && trades.length > 0) {
      await idbSet('trades', 'trading-journal-trades', trades);
      localStorage.removeItem(key);
      return true;
    }
  } catch {
    // Migration failed, keep localStorage data
  }
  return false;
}
