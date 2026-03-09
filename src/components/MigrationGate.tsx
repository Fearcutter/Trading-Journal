import { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadScreenshot } from '../lib/screenshots';
import { idbGet, type StoreName } from '../utils/indexed-db';
import type { Trade } from '../types/trade';
import type { Settings } from '../types/settings';
import type { ApexAccount } from '../types/apex-account';
import type { HabitDefinition, DailyHabitCheckIn, EarnedBadge } from '../types/habit';
import type { PlaybookEntry } from '../types/playbook';
import type { DailyJournalEntry } from '../types/journal';
import type { BacktestSession } from '../types/backtest';

const MIGRATION_KEY = 'supabase-migration-complete';

interface MigrationSource {
  storeName: StoreName;
  key: string;
  table: string;
  isSingleton?: boolean;
  screenshotFields?: string[];
}

const SOURCES: MigrationSource[] = [
  { storeName: 'settings', key: 'trading-journal-settings', table: 'user_settings', isSingleton: true },
  { storeName: 'trades', key: 'trading-journal-trades', table: 'trades', screenshotFields: ['setupScreenshot', 'resultScreenshot'] },
  { storeName: 'apex-accounts', key: 'apex-accounts-data', table: 'apex_accounts' },
  { storeName: 'habits', key: 'habit-definitions', table: 'habit_definitions' },
  { storeName: 'habits', key: 'habit-checkins', table: 'habit_checkins' },
  { storeName: 'habits', key: 'habit-badges', table: 'habit_badges' },
  { storeName: 'playbook', key: 'trading-journal-playbook', table: 'playbook_entries', screenshotFields: ['exampleScreenshots'] },
  { storeName: 'journal', key: 'trading-journal-journal', table: 'journal_entries' },
  { storeName: 'backtest-sessions', key: 'trading-journal-backtest-sessions', table: 'backtest_sessions' },
];

type AnyRecord = Trade | Settings | ApexAccount | HabitDefinition | DailyHabitCheckIn | EarnedBadge | PlaybookEntry | DailyJournalEntry | BacktestSession;

export default function MigrationGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (localStorage.getItem(MIGRATION_KEY)) {
      setChecking(false);
      return;
    }

    async function check() {
      try {
        let found = false;
        for (const src of SOURCES) {
          const data = await idbGet(src.storeName, src.key);
          if (data !== undefined) {
            if (Array.isArray(data) && data.length > 0) { found = true; break; }
            if (!Array.isArray(data) && typeof data === 'object' && data !== null) { found = true; break; }
          }
        }
        setHasData(found);
      } catch {
        // IndexedDB not available — skip migration
      }
      setChecking(false);
    }

    check();
  }, []);

  const runMigration = async () => {
    if (!user) return;
    setMigrating(true);
    const total = SOURCES.length;
    let done = 0;

    for (const src of SOURCES) {
      setStatus(`Migrating ${src.table}...`);
      try {
        const data = await idbGet<AnyRecord | AnyRecord[]>(src.storeName, src.key);
        if (data === undefined) { done++; setProgress(done / total); continue; }

        if (src.isSingleton) {
          await supabase.from(src.table).upsert({
            user_id: user.id,
            data: data,
          }, { onConflict: 'user_id' });
        } else if (Array.isArray(data)) {
          const rows = [];
          for (const item of data) {
            const record = item as unknown as Record<string, unknown>;
            const { id, ...rest } = record;
            const row: Record<string, unknown> = {
              id,
              user_id: user.id,
              data: { ...rest },
            };

            // Copy date to top-level only for tables with a date column
            if ((src.table === 'habit_checkins' || src.table === 'journal_entries') && 'date' in rest && typeof rest.date === 'string') {
              row.date = rest.date;
            }

            // Upload screenshots
            if (src.screenshotFields) {
              for (const field of src.screenshotFields) {
                const val = rest[field];
                if (typeof val === 'string' && val && (val.startsWith('data:') || val.length > 200)) {
                  try {
                    const path = await uploadScreenshot(user.id, src.table, id as string, `${field}.png`, val);
                    const pathCol = field.replace(/([A-Z])/g, '_$1').toLowerCase() + '_path';
                    row[pathCol] = path;
                    delete (row.data as Record<string, unknown>)[field];
                  } catch (e) {
                    console.error(`Migration screenshot upload failed:`, e);
                  }
                } else if (Array.isArray(val)) {
                  const paths: string[] = [];
                  for (let i = 0; i < val.length; i++) {
                    const v = val[i] as string;
                    if (v && (v.startsWith('data:') || v.length > 200)) {
                      try {
                        const path = await uploadScreenshot(user.id, src.table, id as string, `${field}_${i}.png`, v);
                        paths.push(path);
                      } catch {
                        paths.push(v);
                      }
                    } else {
                      paths.push(v);
                    }
                  }
                  const pathsCol = field.replace(/([A-Z])/g, '_$1').toLowerCase() + '_paths';
                  row[pathsCol] = paths;
                  delete (row.data as Record<string, unknown>)[field];
                }
              }
            }

            rows.push(row);
          }

          if (rows.length > 0) {
            // Batch in chunks of 50
            for (let i = 0; i < rows.length; i += 50) {
              const chunk = rows.slice(i, i + 50);
              await supabase.from(src.table).upsert(chunk);
            }
          }
        }
      } catch (e) {
        console.error(`Migration failed for ${src.table}:`, e);
      }

      done++;
      setProgress(done / total);
    }

    localStorage.setItem(MIGRATION_KEY, 'true');
    setMigrating(false);
    setHasData(false);
    setStatus('');
  };

  const skip = () => {
    localStorage.setItem(MIGRATION_KEY, 'true');
    setHasData(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (hasData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-50 mb-2">Migrate Local Data</h2>
          <p className="text-slate-400 text-sm mb-6">
            We found existing data in your browser. Would you like to upload it to your account so it's available on all devices?
          </p>

          {migrating ? (
            <div className="space-y-3">
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="text-slate-400 text-sm text-center">{status}</p>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={runMigration}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Migrate Data
              </button>
              <button
                onClick={skip}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Skip
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
