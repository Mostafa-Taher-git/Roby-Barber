import { ipcMain, app } from 'electron';
import path from 'node:path';
import { getDb } from '../db/client';
import { listAppointments, listChairs, createBooking, seatBooking, seatNextWaiting, finishChair } from '../packages/queue';
import { listServices, listCustomers, listStaff, saveService, deleteService } from '../packages/catalog';
import { overview, logActivity, activity } from '../packages/reports';
import { checkout, recentSales } from '../packages/pos';
import { listExpenses, addExpense, deleteExpense, financials, zReport } from '../packages/cashbox';
import { getSalon, saveSalon, saveLogo, resetLogo, listTemplates, saveTemplates, listOffers, saveOffer, deleteOffer } from '../packages/settings';
import { log } from '../logger';

const logosDir = () => path.join(app.getPath('userData'), 'logos');

type Handler = (args: unknown[]) => unknown;
const handlers: Record<string, Handler> = {
  'overview': () => overview(getDb()),
  'chairs': () => listChairs(getDb()),
  'appointments': ([filter]) => listAppointments(getDb(), filter as string | undefined),
  'waiting-queue': () => listAppointments(getDb(), 'waiting'),
  'create-booking': ([input]) => createBooking(getDb(), input as Parameters<typeof createBooking>[1]),
  'seat-booking': ([id]) => seatBooking(getDb(), id as string),
  'finish-chair': ([id]) => finishChair(getDb(), id as number),
  'call-next': () => {
    const next = seatNextWaiting(getDb());
    if (next) logActivity(getDb(), `تم إجلاس الزبون ${next.name} (${next.id})`);
    return next;
  },
  'services': () => listServices(getDb()),
  'staff': () => listStaff(getDb()),
  'customers': ([query]) => listCustomers(getDb(), (query as string) ?? ''),
  'log-activity': ([text]) => logActivity(getDb(), text as string),
  'activity': () => activity(getDb()),

  // Phase 3 — POS
  'checkout': ([input]) => {
    const receipt = checkout(getDb(), input as Parameters<typeof checkout>[1]);
    logActivity(getDb(), `تم تحصيل فاتورة ${receipt.receiptNo} بمبلغ ${receipt.total} ج.م (${receipt.payLabel}) — ${receipt.customer}`);
    return receipt;
  },
  'sales': () => recentSales(getDb()),

  // Phase 3 — Cashbox
  'financials': ([dateKey]) => financials(getDb(), dateKey as string | undefined),
  'expenses': () => listExpenses(getDb()),
  'add-expense': ([input]) => {
    const row = addExpense(getDb(), input as Parameters<typeof addExpense>[1]);
    logActivity(getDb(), `تم قيد مصروف ${row.no}: ${row.title} بمبلغ ${row.amount} ج.م (${row.method})`);
    return row;
  },
  'delete-expense': ([no]) => {
    const row = deleteExpense(getDb(), no as string);
    logActivity(getDb(), `تم حذف مصروف ${row.no}: ${row.title} (${row.amount} ج.م)`);
    return row;
  },
  'z-report': ([actualCash]) => {
    const report = zReport(getDb(), actualCash === undefined || actualCash === null ? undefined : Number(actualCash));
    if (report.difference !== null) {
      const diff = report.difference;
      logActivity(getDb(), `تقفيل الوردية: المتوقع ${report.expectedDrawer} ج.م — الفعلي ${report.actualCash} ج.م (${diff >= 0 ? 'زيادة' : 'عجز'} ${Math.abs(diff)} ج.م)`);
    }
    return report;
  },

  // Phase 3 — Settings
  'salon': () => getSalon(getDb(), logosDir()),
  'save-salon': ([input]) => saveSalon(getDb(), input as Parameters<typeof saveSalon>[1]),
  'save-logo': ([dataUrl]) => {
    const saved = saveLogo(getDb(), dataUrl as string, logosDir());
    const row = getSalon(getDb(), logosDir());
    return { ...saved, logoDataUrl: row.logoDataUrl };
  },
  'reset-logo': () => resetLogo(getDb(), logosDir()),
  'save-service': ([input]) => saveService(getDb(), input as Parameters<typeof saveService>[1]),
  'delete-service': ([id]) => deleteService(getDb(), id as string),
  'templates': () => listTemplates(getDb()),
  'save-templates': ([list]) => saveTemplates(getDb(), list as Parameters<typeof saveTemplates>[1]),
  'offers': ([onlyActive]) => listOffers(getDb(), Boolean(onlyActive)),
  'save-offer': ([input]) => saveOffer(getDb(), input as Parameters<typeof saveOffer>[1]),
  'delete-offer': ([id]) => deleteOffer(getDb(), id as string),
};

export function setupIpc() {
  for (const [name, fn] of Object.entries(handlers)) {
    ipcMain.handle(`roby:${name}`, (_e, ...args) => {
      try {
        return fn(args);
      } catch (err) {
        log.error(`ipc ${name} failed`, err);
        throw err;
      }
    });
  }
}
