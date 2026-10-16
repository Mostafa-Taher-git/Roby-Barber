// Test-only harness: same migrations + seed + domain functions the app uses, on a throwaway DB.
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { TABLES } from './tables';
import { applySeed, isFreshDb } from './seedRows';
import * as queue from '../packages/queue';
import * as catalog from '../packages/catalog';
import * as reports from '../packages/reports';
import * as pos from '../packages/pos';
import * as cashbox from '../packages/cashbox';
import * as settings from '../packages/settings';

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
    appointments: () => queue.listAppointments(db),
    customers: (q: string) => catalog.listCustomers(db, q),
    overview: () => reports.overview(db),

    totals: pos.totals,
    checkout: (input: Parameters<typeof pos.checkout>[1]) => pos.checkout(db, input),
    sales: () => pos.recentSales(db),

    financials: (dateKey?: string) => cashbox.financials(db, dateKey),
    listExpenses: () => cashbox.listExpenses(db),
    addExpense: (input: Parameters<typeof cashbox.addExpense>[1]) => cashbox.addExpense(db, input),
    deleteExpense: (no: string) => cashbox.deleteExpense(db, no),
    zReport: (actualCash?: number, dateKey?: string) => cashbox.zReport(db, actualCash, dateKey),

    listServices: () => catalog.listServices(db),
    saveService: (input: Parameters<typeof catalog.saveService>[1]) => catalog.saveService(db, input),
    deleteService: (id: string) => catalog.deleteService(db, id),
    getSalon: () => settings.getSalon(db),
    saveSalon: (input: Parameters<typeof settings.saveSalon>[1]) => settings.saveSalon(db, input),
    listTemplates: () => settings.listTemplates(db),
    saveTemplates: (list: Parameters<typeof settings.saveTemplates>[1]) => settings.saveTemplates(db, list),
    listOffers: (onlyActive?: boolean) => settings.listOffers(db, onlyActive),
    saveOffer: (input: Parameters<typeof settings.saveOffer>[1]) => settings.saveOffer(db, input),
    deleteOffer: (id: string) => settings.deleteOffer(db, id),
  };
}
