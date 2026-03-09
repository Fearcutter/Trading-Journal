import { useState, useEffect, useCallback, useRef } from 'react';
import { idbGet, idbSet, type StoreName } from '../utils/indexed-db';

export function useIndexedDB<T>(storeName: StoreName, key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const stored = await idbGet<T>(storeName, key);
        if (!cancelled) {
          if (stored !== undefined) {
            // Merge objects so new default keys aren't lost when loading old stored data
            if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue)) {
              setValue({ ...defaultValue, ...stored });
            } else {
              setValue(stored);
            }
          } else {
            // Fall back to localStorage for migration
            try {
              const lsValue = localStorage.getItem(key);
              if (lsValue) {
                const parsed = JSON.parse(lsValue);
                const resolved = (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue))
                  ? { ...defaultValue, ...parsed }
                  : parsed;
                setValue(resolved);
                await idbSet(storeName, key, resolved);
                localStorage.removeItem(key);
              }
            } catch {
              // No localStorage fallback available
            }
          }
          loadedRef.current = true;
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          loadedRef.current = true;
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [storeName, key]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    if (!loadedRef.current) {
      console.warn(`Blocked write to "${storeName}/${key}" before initial load completed`);
      return;
    }
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
