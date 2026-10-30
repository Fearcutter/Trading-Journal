import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useView } from '../context/ViewContext';
import { supabase } from '../lib/supabase';

export function useSupabaseSingleton<T extends object>(
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const { user } = useAuth();
  const { journalOwnerId, readOnly } = useView();
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        // Coach gets the owner's settings through a function that strips private fields
        const { data, error } = readOnly
          ? await supabase.rpc('get_shared_settings', { p_owner: journalOwnerId })
              .then(r => ({ data: r.data ? { data: r.data } : null, error: r.error }))
          : await supabase
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
  }, [user, journalOwnerId, readOnly]);

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
    if (!loadedRef.current || readOnly) return;
    setValue(prev => {
      const resolved = newValue instanceof Function ? newValue(prev) : newValue;
      persist(resolved);
      return resolved;
    });
  }, [persist, readOnly]);

  return [value, updateValue, loading];
}
