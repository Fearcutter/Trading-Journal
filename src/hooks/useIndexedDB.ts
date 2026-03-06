import { useState, useEffect, useCallback } from 'react';
import { idbGet, idbSet, migrateFromLocalStorage, type StoreName } from '../utils/indexed-db';

export function useIndexedDB<T>(storeName: StoreName, key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Attempt migration on first load
        if (storeName === 'trades') {
          await migrateFromLocalStorage();
        }

        const stored = await idbGet<T>(storeName, key);
        if (!cancelled) {
          if (stored !== undefined) {
            setValue(stored);
          } else {
            // Fall back to localStorage
            try {
              const lsValue = localStorage.getItem(key);
              if (lsValue) {
                const parsed = JSON.parse(lsValue);
                setValue(parsed);
                await idbSet(storeName, key, parsed);
              }
            } catch {
              // No localStorage fallback available
            }
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [storeName, key]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const resolved = newValue instanceof Function ? newValue(prev) : newValue;
      idbSet(storeName, key, resolved).catch(e =>
        console.error(`Failed to save to IndexedDB "${storeName}/${key}":`, e)
      );
      return resolved;
    });
  }, [storeName, key]);

  return [value, updateValue, loading];
}
