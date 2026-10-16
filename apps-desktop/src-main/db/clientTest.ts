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
import * as payroll from '../packages/payroll';
import * as payrollCompute from '../packages/payroll/compute';
import * as stock from '../packages/stock';
import * as stockLevels from '../packages/stock/levels';
import * as license from '../packages/license';
import * as key from '../packages/license/key';
import { machineId } from '../packages/license/machineId';
import * as whatsapp from '../packages/whatsapp';
import * as waCompose from '../packages/whatsapp/compose';

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

    staffRoster: () => payroll.listStaffFull(db),
    payroll: (month: string) => payroll.staffPayroll(db, month),
    saveStaff: (input: Parameters<typeof payroll.saveStaff>[1]) => payroll.saveStaff(db, input),
    deleteStaff: (id: string) => payroll.deleteStaff(db, id),
    addAdvance: (staffId: string, amount: number, note = '') => payroll.addAdvance(db, staffId, amount, note),
    deleteAdvance: (id: string) => payroll.deleteAdvance(db, id),
    payStaff: (staffId: string, month: string) => payroll.payStaff(db, staffId, month),
    computePayroll: payrollCompute.computePayroll,
    aggregateSales: payrollCompute.aggregateSales,
    monthKey: payrollCompute.monthKey,

    inventory: () => stock.inventoryPage(db),
    saveStock: (input: Parameters<typeof stock.saveStockItem>[1]) => stock.saveStockItem(db, input),
    deleteStock: (id: string) => stock.deleteStockItem(db, id),
    restock: (id: string, qty: number) => stock.restockItem(db, id, qty),
    stockLevels: stockLevels.stockLevels,
    isCritical: stockLevels.isCritical,

    licenseState: (publicKeyPem: string, mid?: string) => license.licenseState(db, publicKeyPem, mid),
    activate: (keyStr: string, publicKeyPem: string, mid?: string) => license.activateLicense(db, keyStr, publicKeyPem, mid),
    licenseRow: (mid: string) =>
      (db as unknown as { $client: { prepare: (sql: string) => { get: (m: string) => unknown } } }).$client
        .prepare('SELECT machine_id, key, activated_at, trial_started_at, last_seen, tampered_at FROM licenses WHERE machine_id = ?')
        .get(mid),
    setLicenseRow: (mid: string, patch: { trialStartedAt?: string; lastSeen?: string; activatedAt?: string | null; key?: string; tamperedAt?: string | null }) => {
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (patch.trialStartedAt !== undefined) { sets.push('trial_started_at = ?'); vals.push(patch.trialStartedAt); }
      if (patch.lastSeen !== undefined) { sets.push('last_seen = ?'); vals.push(patch.lastSeen); }
      if (patch.activatedAt !== undefined) { sets.push('activated_at = ?'); vals.push(patch.activatedAt); }
      if (patch.key !== undefined) { sets.push('key = ?'); vals.push(patch.key); }
      if (patch.tamperedAt !== undefined) { sets.push('tampered_at = ?'); vals.push(patch.tamperedAt); }
      (db as unknown as { $client: { prepare: (sql: string) => { run: (...a: unknown[]) => unknown } } }).$client
        .prepare(`UPDATE licenses SET ${sets.join(', ')} WHERE machine_id = ?`).run(...vals, mid);
    },
    decodeLicenseKey: key.decodeLicenseKey,
    verifyLicenseKey: key.verifyLicenseKey,
    reasonAr: key.reasonAr,
    buildPayload: key.buildPayload,
    encodeLicenseKey: key.encodeLicenseKey,
    payloadBytes: key.payloadBytes,
    machineId,
    trialDays: license.TRIAL_DAYS,

    waShare: (input: Parameters<typeof whatsapp.waShare>[1]) => whatsapp.waShare(db, input),
    normalizePhone: waCompose.normalizeEgyptPhone,
    fillTemplate: waCompose.fillTemplate,
    waLink: waCompose.waLink,
  };
}
