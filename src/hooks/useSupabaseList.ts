import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useView } from '../context/ViewContext';
import { supabase } from '../lib/supabase';
import { uploadScreenshot, getSignedUrls, isBase64, storagePathOf, SIGNED_URL_EXPIRY } from '../lib/screenshots';

interface UseSupabaseListOptions {
  screenshotFields?: string[];
}

/** Re-sign screenshot links once they're half way to expiring, so an open tab never shows a dead link. */
const RESIGN_AFTER_MS = (SIGNED_URL_EXPIRY * 1000) / 2;

export function useSupabaseList<T extends { id: string }>(
  table: string,
  options?: UseSupabaseListOptions
): [T[], (value: T[] | ((prev: T[]) => T[])) => void, boolean] {
  const { user } = useAuth();
  const { journalOwnerId, readOnly } = useView();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevItemsRef = useRef<T[]>([]);
  const signedAtRef = useRef(0);
  const itemsRef = useRef<T[]>([]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // Callers pass a fresh array each render; key on its contents so callbacks below stay stable
  const fieldsKey = (options?.screenshotFields ?? []).join(',');
  const screenshotFields = useMemo(() => (fieldsKey ? fieldsKey.split(',') : []), [fieldsKey]);

  // Every storage path behind the items' screenshot fields (stored paths or our signed links)
  const screenshotPaths = useCallback((list: T[]): string[] => {
    const paths: string[] = [];
    for (const item of list) {
      for (const field of screenshotFields) {
        const val = (item as Record<string, unknown>)[field];
        for (const v of Array.isArray(val) ? val : [val]) {
          const path = storagePathOf(v);
          if (path) paths.push(path);
        }
      }
    }
    return paths;
  }, [screenshotFields]);

  // Swap each screenshot value for its fresh signed link; anything without one is left as-is
  const withSignedUrls = useCallback((list: T[], urls: Map<string, string>): T[] => {
    if (urls.size === 0) return list;
    const swap = (v: unknown) => {
      const path = storagePathOf(v);
      return (path && urls.get(path)) || v;
    };
    return list.map(item => {
      const next = { ...item } as Record<string, unknown>;
      for (const field of screenshotFields) {
        const val = next[field];
        next[field] = Array.isArray(val) ? val.map(swap) : swap(val);
      }
      return next as T;
    });
  }, [screenshotFields]);

  const signAll = useCallback(async (list: T[]): Promise<Map<string, string>> => {
    const paths = screenshotPaths(list);
    if (paths.length === 0) return new Map();
    try {
      const urls = await getSignedUrls(paths);
      signedAtRef.current = Date.now();
      return urls;
    } catch (e) {
      console.error(`[useSupabaseList] Failed to sign screenshot links for "${table}":`, e);
      return new Map();
    }
  }, [screenshotPaths, table]);

  // Links last 24h; when the tab is open (or comes back from sleep) past the half-way mark, sign them again
  useEffect(() => {
    if (screenshotFields.length === 0) return;
    let running = false;
    const refresh = async () => {
      if (running || !loadedRef.current || document.visibilityState !== 'visible') return;
      if (Date.now() - signedAtRef.current < RESIGN_AFTER_MS) return;
      running = true;
      const urls = await signAll(itemsRef.current);
      running = false;
      if (urls.size === 0) return;
      prevItemsRef.current = withSignedUrls(prevItemsRef.current, urls);
      setItems(prev => withSignedUrls(prev, urls));
    };
    const timer = setInterval(refresh, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [signAll, withSignedUrls, screenshotFields.length]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', journalOwnerId);

        if (!cancelled && error) {
          console.error(`[useSupabaseList] Failed to load "${table}":`, error);
          toast.error(`Failed to load ${table}: ${error.message}`);
        }
        if (!cancelled && !error && data) {
          const reconstructed = data.map(row => {
            const item = { id: row.id, ...row.data } as T;
            // Copy top-level screenshot path columns if they exist
            for (const field of screenshotFields) {
              const pathCol = field.replace(/([A-Z])/g, '_$1').toLowerCase() + '_path';
              if (row[pathCol]) {
                (item as Record<string, unknown>)[field] = row[pathCol];
              }
              // Handle array screenshot paths column
              const pathsCol = field.replace(/([A-Z])/g, '_$1').toLowerCase() + '_paths';
              if (row[pathsCol]) {
                (item as Record<string, unknown>)[field] = row[pathsCol];
              }
            }
            return item;
          });

          // Resolve signed URLs
          const withUrls = withSignedUrls(reconstructed, await signAll(reconstructed));
          if (!cancelled) {
            setItems(withUrls);
            prevItemsRef.current = withUrls;
            loadedRef.current = true;
            setLoading(false);
          }
        } else if (!cancelled) {
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
  }, [user, table, journalOwnerId]);

  const persist = useCallback(async (newItems: T[]) => {
    if (!user) return;

    const prevMap = new Map(prevItemsRef.current.map(i => [i.id, i]));
    const newMap = new Map(newItems.map(i => [i.id, i]));

    // Deletes
    const deletedIds = [...prevMap.keys()].filter(id => !newMap.has(id));
    if (deletedIds.length > 0) {
      const { error: deleteError } = await supabase.from(table).delete().in('id', deletedIds);
      if (deleteError) {
        console.error(`[useSupabaseList] Failed to delete from "${table}":`, deleteError);
        toast.error(`Failed to delete from ${table}: ${deleteError.message}`);
      }
    }

    // Upserts
    const upserts: Record<string, unknown>[] = [];
    for (const item of newItems) {
      const prev = prevMap.get(item.id);
      // Only upsert if new or changed
      if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
        const { id, ...rest } = item as Record<string, unknown>;
        const row: Record<string, unknown> = {
          id,
          user_id: user.id,
          data: {} as Record<string, unknown>,
        };

        const dataObj = { ...rest } as Record<string, unknown>;

        // Handle screenshot fields — upload base64 to storage
        for (const field of screenshotFields) {
          const val = dataObj[field];
          if (typeof val === 'string' && isBase64(val)) {
            try {
              const path = await uploadScreenshot(
                user.id,
                table,
                id as string,
                `${field}.png`,
                val
              );
              const pathCol = field.replace(/([A-Z])/g, '_$1').toLowerCase() + '_path';
              row[pathCol] = path;
              // Don't store base64 in data column
              delete dataObj[field];
            } catch (e) {
              console.error(`Failed to upload screenshot for ${field}:`, e);
            }
          } else if (Array.isArray(val)) {
            const paths: string[] = [];
            for (let i = 0; i < val.length; i++) {
              const v = val[i];
              if (typeof v === 'string' && isBase64(v)) {
                try {
                  const path = await uploadScreenshot(
                    user.id,
                    table,
                    id as string,
                    `${field}_${i}.png`,
                    v
                  );
                  paths.push(path);
                } catch (e) {
                  console.error(`Failed to upload screenshot for ${field}[${i}]:`, e);
                  paths.push(v);
                }
              } else {
                // Store the path, never a signed link (those expire)
                paths.push(storagePathOf(v) ?? v);
              }
            }
            const pathsCol = field.replace(/([A-Z])/g, '_$1').toLowerCase() + '_paths';
            row[pathsCol] = paths;
            delete dataObj[field];
          } else if (typeof val === 'string' && val && !isBase64(val)) {
            // Already uploaded: a storage path or our signed link — keep the path in its column
            const path = storagePathOf(val);
            if (path) {
              const pathCol = field.replace(/([A-Z])/g, '_$1').toLowerCase() + '_path';
              row[pathCol] = path;
            }
            delete dataObj[field];
          }
        }

        row.data = dataObj;

        // Copy date field to top-level only for tables with a date column
        if ((table === 'habit_checkins' || table === 'journal_entries') && 'date' in rest && typeof rest.date === 'string') {
          row.date = rest.date;
        }

        upserts.push(row);
      }
    }

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase.from(table).upsert(upserts);
      if (upsertError) {
        console.error(`[useSupabaseList] Failed to save to "${table}":`, upsertError);
        toast.error(`Failed to save to ${table}: ${upsertError.message}`);
        return; // Don't advance prevItemsRef so the next attempt re-tries the full diff
      }
    }

    prevItemsRef.current = newItems;
  }, [user, table, screenshotFields]);

  const updateItems = useCallback((newValue: T[] | ((prev: T[]) => T[])) => {
    // Coach view is read-only: never change or persist the owner's data
    if (!loadedRef.current || readOnly) return;
    setItems(prev => {
      const resolved = newValue instanceof Function ? newValue(prev) : newValue;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        persist(resolved);
      }, 300);

      return resolved;
    });
  }, [persist, readOnly]);

  return [items, updateItems, loading];
}
