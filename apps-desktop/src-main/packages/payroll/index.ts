// Staff & payroll DB-facing module — feed the pure math in ./compute.ts and persist the extras.
import { eq } from 'drizzle-orm';
import { chairs, sales, staff, staffAdvances, staffPayments, type BetterSQLiteDatabase } from '../../db/schema';
import { aggregateSales, computePayroll, monthKey, type AdvanceRow, type PaymentRow, type PayrollStaffRow } from './compute';
import { readImageDataUrl, removeImage, saveImageDataUrl } from '../images';

function activeStaff(db: BetterSQLiteDatabase): PayrollStaffRow[] {
  return db.select().from(staff).all()
    .filter((s) => !s.deletedAt)
    .map((s) => ({ id: s.id, nameAr: s.nameAr, role: s.role, commPct: s.commPct, salary: s.salary, photoPath: s.photoPath }));
}

/** Full roster with photos — used by the staff page cards. */
export function listStaffFull(db: BetterSQLiteDatabase, photosDir?: string) {
  return activeStaff(db).map((s) => ({ ...s, photoDataUrl: readImageDataUrl(photosDir, s.photoPath) }));
}

/** Monthly payroll summary: per-staff revenue/tips from sales, advances + payment state for the month. */
export function staffPayroll(db: BetterSQLiteDatabase, month: string, photosDir?: string) {
  const rows = db.select().from(sales).all().map((s) => ({ barber: s.barber, subtotal: s.subtotal, discount: s.discount, tip: s.tip, at: s.at }));
  const advances = db.select().from(staffAdvances).all().map((a): AdvanceRow => ({ id: a.id, staffId: a.staffId, amount: a.amount, note: a.note, at: a.at }));
  const payments = db.select().from(staffPayments).all().map((p): PaymentRow => ({ id: p.id, staffId: p.staffId, amount: p.amount, month: p.month, at: p.at }));
  const summary = computePayroll(activeStaff(db), aggregateSales(rows, month), advances, payments, month);
  return {
    ...summary,
    items: summary.items.map((it) => ({ ...it, photoDataUrl: readImageDataUrl(photosDir, it.photoPath) })),
  };
}

export interface StaffInput {
  id?: string; nameAr: string; role: string; commPct: number; salary: number; photoDataUrl?: string | null;
}

export function saveStaff(db: BetterSQLiteDatabase, input: StaffInput, photosDir?: string) {
  const nameAr = input.nameAr.trim();
  if (!nameAr) throw new Error('اسم الأسطى مطلوب');
  const commPct = Math.round(input.commPct);
  if (!Number.isFinite(commPct) || commPct < 0 || commPct > 100) throw new Error('نسبة العمولة يجب أن تكون بين 0 و 100');
  const salary = Math.round(input.salary);
  if (!Number.isFinite(salary) || salary < 0) throw new Error('الراتب الأساسي غير صحيح');
  const role = input.role.trim() || 'كوافير';
  if (input.id) {
    const row = db.select().from(staff).where(eq(staff.id, input.id)).get();
    if (!row || row.deletedAt) throw new Error('الأسطى غير موجود');
    let photoPath = row.photoPath;
    if (input.photoDataUrl) {
      const old = photoPath;
      photoPath = saveImageDataUrl(photosDir!, 'staff', input.photoDataUrl);
      removeImage(photosDir, old);
    }
    db.update(staff).set({ nameAr, role, commPct, salary, photoPath }).where(eq(staff.id, input.id)).run();
    return listStaffFull(db, photosDir).find((s) => s.id === input.id)!;
  }
  const id = `stf_${Date.now()}`;
  const photoPath = input.photoDataUrl ? saveImageDataUrl(photosDir!, 'staff', input.photoDataUrl) : null;
  db.insert(staff).values({ id, nameAr, role, commPct, salary, photoPath }).run();
  return listStaffFull(db, photosDir).find((s) => s.id === id)!;
}

/** Soft delete (DESIGN §5). Frees any chair still pointing at the barber; history keeps the name. */
export function deleteStaff(db: BetterSQLiteDatabase, id: string) {
  const row = db.select().from(staff).where(eq(staff.id, id)).get();
  if (!row || row.deletedAt) throw new Error('الأسطى غير موجود');
  db.update(staff).set({ deletedAt: new Date().toISOString() }).where(eq(staff.id, id)).run();
  db.update(chairs).set({ barberId: null }).where(eq(chairs.barberId, id)).run();
  return { id, nameAr: row.nameAr };
}

function nextAdvanceNo(db: BetterSQLiteDatabase): string {
  const ids = db.select({ id: staffAdvances.id }).from(staffAdvances).all();
  const max = ids.reduce((m, r) => {
    const n = Number(r.id.replace(/^ADV-/, ''));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 100);
  return `ADV-${max + 1}`;
}

export function addAdvance(db: BetterSQLiteDatabase, staffId: string, amount: number, note: string) {
  const row = db.select().from(staff).where(eq(staff.id, staffId)).get();
  if (!row || row.deletedAt) throw new Error('الأسطى غير موجود');
  const value = Math.round(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('قيمة السلفة يجب أن تكون أكبر من صفر');
  const adv: AdvanceRow = { id: nextAdvanceNo(db), staffId, amount: value, note: note.trim() || 'سلفة', at: new Date().toISOString() };
  db.insert(staffAdvances).values(adv).run();
  return adv;
}

/** Removing a mistaken advance is a pre-payment correction — allowed until the month is paid out. */
export function deleteAdvance(db: BetterSQLiteDatabase, id: string) {
  const row = db.select().from(staffAdvances).where(eq(staffAdvances.id, id)).get();
  if (!row) throw new Error('السلفة غير موجودة');
  const paid = db.select().from(staffPayments).all().some((p) => p.staffId === row.staffId && p.month === monthKey(row.at));
  if (paid) throw new Error('تم صرف مرتب هذا الشهر — لا يمكن تعديل سلفه');
  db.delete(staffAdvances).where(eq(staffAdvances.id, id)).run();
  return { id, staffId: row.staffId, amount: row.amount };
}

/** Finalize payroll: recomputes net inside main (never trusts a UI amount) and records the payment. */
export function payStaff(db: BetterSQLiteDatabase, staffId: string, month: string) {
  const summary = staffPayroll(db, month);
  const item = summary.items.find((s) => s.staffId === staffId);
  if (!item) throw new Error('الأسطى غير موجود');
  if (item.paid) throw new Error('تم صرف مرتب هذا الشهر بالفعل');
  if (item.net <= 0) throw new Error('صافي المستحق غير موجب — راجع السلف المسجلة');
  const payment = { id: `pay_${Date.now()}`, staffId, amount: item.net, month, at: new Date().toISOString() };
  db.insert(staffPayments).values(payment).run();
  return { ...payment, nameAr: item.nameAr };
}
