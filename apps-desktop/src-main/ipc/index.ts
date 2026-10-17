import { ipcMain, app, dialog, shell } from 'electron';
import path from 'node:path';
import { getDb, rawClient, closeDb, dbPath } from '../db/client';
import { listAppointments, listChairs, createBooking, seatBooking, seatNextWaiting, finishChair } from '../packages/queue';
import { listServices, listCustomers, listStaff, saveService, deleteService } from '../packages/catalog';
import { overview, logActivity, activity } from '../packages/reports';
import { checkout, recentSales } from '../packages/pos';
import { listExpenses, addExpense, deleteExpense, financials, zReport } from '../packages/cashbox';
import { getSalon, saveSalon, saveLogo, resetLogo, listTemplates, saveTemplates, listOffers, saveOffer, deleteOffer, getContactWhatsapp, setContactWhatsapp } from '../packages/settings';
import { listStaffFull, staffPayroll, saveStaff, deleteStaff, addAdvance, deleteAdvance, payStaff } from '../packages/payroll';
import { inventoryPage, saveStockItem, deleteStockItem, restockItem } from '../packages/stock';
import { licenseState, activateLicense } from '../packages/license';
import { PUBLIC_KEY_PEM } from '../packages/license/publicKey';
import { waShare } from '../packages/whatsapp';
import { createBackup, listBackups, validateBackup, applyDbFile, exportBackup, CORE_TABLES } from '../packages/backup';
import { log } from '../logger';

const logosDir = () => path.join(app.getPath('userData'), 'logos');
const staffPhotosDir = () => path.join(app.getPath('userData'), 'staff');
const backupsDir = () => path.join(app.getPath('userData'), 'backups');
const currentMonth = () => new Date().toISOString().slice(0, 7);

/** Validate → safety snapshot → swap files → relaunch (Phase 7 restore flow). */
function restoreFrom(file: string): { ok: boolean; error?: string } {
  const check = validateBackup(file, CORE_TABLES);
  if (!check.ok) return { ok: false, error: check.error };
  try {
    createBackup(rawClient(), backupsDir());
    logActivity(getDb(), `تم أخذ نسخة أمان قبل الاستعادة (${path.basename(file)})`);
  } catch (err) {
    log.warn('pre-restore safety backup failed', err);
  }
  closeDb();
  applyDbFile(check.dbFile, dbPath());
  log.info('restore applied — relaunching', path.basename(file));
  setTimeout(() => { app.relaunch(); app.exit(0); }, 600);
  return { ok: true };
}

type Handler = (args: unknown[]) => unknown;
const handlers: Record<string, Handler> = {
  'overview': () => overview(getDb(), backupsDir()),
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

  // Phase 4 — Staff & Payroll
  'staff-roster': () => listStaffFull(getDb(), staffPhotosDir()),
  'payroll': ([month]) => staffPayroll(getDb(), (month as string) || currentMonth(), staffPhotosDir()),
  'save-staff': ([input]) => {
    const row = saveStaff(getDb(), input as Parameters<typeof saveStaff>[1], staffPhotosDir());
    logActivity(getDb(), `تم حفظ بيانات الأسطى ${row.nameAr} (عمولة ${row.commPct}% — راتب ${row.salary} ج.م)`);
    return row;
  },
  'delete-staff': ([id]) => {
    const row = deleteStaff(getDb(), id as string);
    logActivity(getDb(), `تم حذف الأسطى ${row.nameAr} من الطاقم`);
    return row;
  },
  'add-advance': ([staffId, amount, note]) => {
    const adv = addAdvance(getDb(), staffId as string, Number(amount), (note as string) ?? '');
    logActivity(getDb(), `سلفة ${adv.id}: ${adv.amount} ج.م للأسطى (${adv.note})`);
    return adv;
  },
  'delete-advance': ([id]) => {
    const adv = deleteAdvance(getDb(), id as string);
    logActivity(getDb(), `تم حذف سلفة ${adv.id} (${adv.amount} ج.م)`);
    return adv;
  },
  'pay-staff': ([staffId, month]) => {
    const payment = payStaff(getDb(), staffId as string, (month as string) || currentMonth());
    logActivity(getDb(), `تم صرف مرتب ${payment.nameAr} لشهر ${payment.month} بمبلغ ${payment.amount} ج.م`);
    return payment;
  },

  // Phase 4 — Stock
  'inventory': () => inventoryPage(getDb()),
  'save-stock': ([input]) => {
    const row = saveStockItem(getDb(), input as Parameters<typeof saveStockItem>[1]);
    logActivity(getDb(), `تم حفظ صنف المخزن: ${row.name} (${row.qty} قطعة)`);
    return row;
  },
  'delete-stock': ([id]) => {
    const row = deleteStockItem(getDb(), id as string);
    logActivity(getDb(), `تم حذف صنف المخزن: ${row.name}`);
    return row;
  },
  'restock': ([id, qty]) => {
    const row = restockItem(getDb(), id as string, Number(qty));
    logActivity(getDb(), `توريد مخزن: ${row.name} +${row.added} قطعة (الكمية الآن ${row.qty})`);
    return row;
  },

  // Phase 5 — Licensing
  'license-state': () => licenseState(getDb(), PUBLIC_KEY_PEM),
  'activate': ([key]) => {
    const state = activateLicense(getDb(), key as string, PUBLIC_KEY_PEM);
    logActivity(getDb(), `تم تفعيل النسخة مدى الحياة على هذا الجهاز (${state.mid})`);
    return state;
  },

  // Phase 6 — WhatsApp
  'wa-share': ([input]) => waShare(getDb(), input as Parameters<typeof waShare>[1]),

  // License contact (editable anytime from Settings) — the number the lock screen sends the MID to.
  'license-contact': () => ({ phone: getContactWhatsapp(getDb()) }),
  'save-license-contact': ([phone]) => {
    const saved = setContactWhatsapp(getDb(), String(phone ?? ''));
    logActivity(getDb(), saved ? `تم ضبط رقم واتساب التفعيل: ${saved}` : 'تم مسح رقم واتساب التفعيل');
    return { phone: saved };
  },

  // Phase 7 — Backup & restore
  'backup-now': () => {
    const info = createBackup(rawClient(), backupsDir());
    logActivity(getDb(), `نسخة احتياطية يدوية: ${info.name}`);
    return info;
  },
  'backup-list': () => listBackups(backupsDir()),
  'backup-status': () => {
    const list = listBackups(backupsDir());
    return { last: list[0] ?? null, count: list.length, dir: backupsDir() };
  },
  'backup-open-folder': async () => {
    await shell.openPath(backupsDir());
    return { ok: true };
  },
  'backup-export': async ([file]) => {
    const source = (file as string) || listBackups(backupsDir())[0]?.path;
    if (!source) throw new Error('لا توجد نسخة احتياطية للتصدير');
    const res = await dialog.showSaveDialog({
      title: 'تصدير نسخة احتياطية (فلاشة USB مثلاً)',
      defaultPath: `RobyBarber-backup-${new Date().toISOString().slice(0, 10)}.db.gz`,
      filters: [{ name: 'Roby Barber backup', extensions: ['gz'] }],
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    exportBackup(source, res.filePath);
    logActivity(getDb(), `تم تصدير نسخة احتياطية إلى ${res.filePath}`);
    return { ok: true, path: res.filePath };
  },
  'backup-import': async () => {
    const res = await dialog.showOpenDialog({
      title: 'اختر ملف نسخة احتياطية (.db.gz)',
      filters: [{ name: 'Roby Barber backup', extensions: ['gz'] }],
      properties: ['openFile'],
    });
    if (res.canceled || res.filePaths.length === 0) return { ok: false, canceled: true };
    return restoreFrom(res.filePaths[0]);
  },
  'restore-backup': ([file]) => restoreFrom(file as string),
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
