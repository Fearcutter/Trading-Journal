import { useState, useCallback } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      const parsed = stored ? JSON.parse(stored) : defaultValue;
      return (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue))
        ? { ...defaultValue, ...parsed }
        : parsed;
    } catch {
      return defaultValue;
    }
  });

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const resolved = newValue instanceof Function ? newValue(prev) : newValue;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch (e) {
        console.error(`Failed to save to localStorage key "${key}":`, e);
      }
      return resolved;
    });
  }, [key]);

  return [value, updateValue];
}
