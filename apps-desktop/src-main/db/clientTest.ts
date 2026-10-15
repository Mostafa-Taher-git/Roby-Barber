// Test-only harness: same migrations + seed + queue functions the app uses, on a throwaway DB.
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { TABLES } from './tables';
import { applySeed, isFreshDb } from './seedRows';
import * as queue from '../packages/queue';
import * as catalog from '../packages/catalog';
import * as reports from '../packages/reports';

export function build(file: string) {
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  for (const sql of TABLES) sqlite.exec(sql);
  const db = drizzle(sqlite) as unknown as BetterSQLite3Database;
  const raw = (db as unknown as { $client: unknown }).$client;
  if (isFreshDb(raw)) applySeed(raw);

  return {
    prepare: (sql: string) => sqlite.prepare(sql),
    close: () => sqlite.close(),
    seatNextWaiting: () => queue.seatNextWaiting(db),
    finishChair: (id: number) => queue.finishChair(db, id),
    createBooking: (input: Parameters<typeof queue.createBooking>[1]) => queue.createBooking(db, input),
    customers: (q: string) => catalog.listCustomers(db, q),
    overview: () => reports.overview(db),
  };
}
