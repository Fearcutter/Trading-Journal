import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadScreenshot, getSignedUrl, isBase64 } from '../lib/screenshots';

interface UseSupabaseListOptions {
  screenshotFields?: string[];
}

export function useSupabaseList<T extends { id: string }>(
  table: string,
  options?: UseSupabaseListOptions
): [T[], (value: T[] | ((prev: T[]) => T[])) => void, boolean] {
  const { user } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevItemsRef = useRef<T[]>([]);
  const signedUrlCache = useRef<Map<string, string>>(new Map());

  const screenshotFields = options?.screenshotFields ?? [];

  // Resolve screenshot paths to signed URLs
  const resolveScreenshots = useCallback(async (item: T): Promise<T> => {
    if (screenshotFields.length === 0) return item;

    const resolved = { ...item } as Record<string, unknown>;
    for (const field of screenshotFields) {
      const val = resolved[field];
      if (typeof val === 'string' && val && !isBase64(val) && !val.startsWith('http')) {
        // It's a storage path — get signed URL
        const cached = signedUrlCache.current.get(val);
        if (cached) {
          resolved[field] = cached;
        } else {
          try {
            const url = await getSignedUrl(val);
            signedUrlCache.current.set(val, url);
            resolved[field] = url;
          } catch {
            // Leave as-is if signing fails
          }
        }
      } else if (Array.isArray(val)) {
        // Handle array of screenshot paths (e.g. playbook exampleScreenshots)
        const urls: string[] = [];
        for (const v of val) {
          if (typeof v === 'string' && v && !isBase64(v) && !v.startsWith('http')) {
            const cached = signedUrlCache.current.get(v);
            if (cached) {
              urls.push(cached);
            } else {
              try {
                const url = await getSignedUrl(v);
                signedUrlCache.current.set(v, url);
                urls.push(url);
              } catch {
                urls.push(v);
              }
            }
          } else {
            urls.push(v);
          }
        }
        resolved[field] = urls;
      }
    }
    return resolved as T;
  }, [screenshotFields]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', user!.id);

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
          const withUrls = await Promise.all(reconstructed.map(resolveScreenshots));
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
  }, [user, table]);

  const persist = useCallback(async (newItems: T[]) => {
    if (!user) return;

    const prevMap = new Map(prevItemsRef.current.map(i => [i.id, i]));
    const newMap = new Map(newItems.map(i => [i.id, i]));

    // Deletes
    const deletedIds = [...prevMap.keys()].filter(id => !newMap.has(id));
    if (deletedIds.length > 0) {
      await supabase.from(table).delete().in('id', deletedIds);
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
                paths.push(v);
              }
            }
            const pathsCol = field.replace(/([A-Z])/g, '_$1').toLowerCase() + '_paths';
            row[pathsCol] = paths;
            delete dataObj[field];
          } else if (typeof val === 'string' && val && !isBase64(val)) {
            // It's already a storage path or signed URL — keep path in column
            // If it's a signed URL, we need to extract the original path
            // For now, remove from data and let the path column handle it
            if (!val.startsWith('http')) {
              const pathCol = field.replace(/([A-Z])/g, '_$1').toLowerCase() + '_path';
              row[pathCol] = val;
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
      await supabase.from(table).upsert(upserts);
    }

    prevItemsRef.current = newItems;
  }, [user, table, screenshotFields]);

  const updateItems = useCallback((newValue: T[] | ((prev: T[]) => T[])) => {
    if (!loadedRef.current) return;
    setItems(prev => {
      const resolved = newValue instanceof Function ? newValue(prev) : newValue;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        persist(resolved);
      }, 300);

      return resolved;
    });
  }, [persist]);

  return [items, updateItems, loading];
}
