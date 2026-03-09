import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function useSupabaseSingleton<T extends object>(
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const { user } = useAuth();
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('data')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (!cancelled) {
          if (!error && data?.data) {
            setValue({ ...defaultValue, ...data.data as T });
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
  }, [user]);

  const persist = useCallback((data: T) => {
    if (!user) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, data }, { onConflict: 'user_id' });
    }, 500);
  }, [user]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    if (!loadedRef.current) return;
    setValue(prev => {
      const resolved = newValue instanceof Function ? newValue(prev) : newValue;
      persist(resolved);
      return resolved;
    });
  }, [persist]);

  return [value, updateValue, loading];
}
