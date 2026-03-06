import type { Trade } from '../types/trade';
import { idbSet, idbGet, idbDelete, idbGetAll } from './indexed-db';

const MAX_BACKUPS = 5;

export async function createBackup(trades: Trade[]): Promise<void> {
  const key = `backup-${Date.now()}`;
  await idbSet('backups', key, { trades, date: new Date().toISOString(), tradeCount: trades.length });

  // Prune old backups
  const all = await idbGetAll<{ trades: Trade[]; date: string; tradeCount: number }>('backups');
  if (all.length > MAX_BACKUPS) {
    const sorted = all.sort((a, b) => a.key.localeCompare(b.key));
    const toDelete = sorted.slice(0, all.length - MAX_BACKUPS);
    for (const item of toDelete) {
      await idbDelete('backups', item.key);
    }
  }
}

export async function getBackups(): Promise<{ key: string; date: string; tradeCount: number }[]> {
  const all = await idbGetAll<{ date: string; tradeCount: number }>('backups');
  return all
    .map(({ key, value }) => ({ key, date: value.date, tradeCount: value.tradeCount }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

export async function restoreBackup(key: string): Promise<Trade[]> {
  const backup = await idbGet<{ trades: Trade[] }>('backups', key);
  if (!backup) throw new Error(`Backup "${key}" not found`);
  return backup.trades;
}
