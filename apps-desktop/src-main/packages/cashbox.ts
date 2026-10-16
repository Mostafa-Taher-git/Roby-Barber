// Cashbox — expenses CRUD, live financials, Z-report. All money from sales/expenses rows only.
import { eq } from 'drizzle-orm';
import { expenses, sales, type BetterSQLiteDatabase } from '../db/schema';
import { log } from '../logger';
import { PAY_LABELS, type PayMethod } from './pos';

export interface ExpenseInput {
  title: string;
  amount: number;
  cat: string;
  person: string;
  method: string;
}

export function listExpenses(db: BetterSQLiteDatabase) {
  return db.select().from(expenses).all()
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .map((e) => ({ no: e.no, at: e.at, time: e.time, title: e.title, cat: e.cat, person: e.person, method: e.method, amount: e.amount }));
}

function nextExpenseNo(db: BetterSQLiteDatabase) {
  const max = db.select().from(expenses).all()
    .reduce((m, e) => Math.max(m, Number(e.no.replace(/\D/g, '')) || 0), 100);
  return `EXP-${max + 1}`;
}

export function addExpense(db: BetterSQLiteDatabase, input: ExpenseInput) {
  const amount = Math.round(input.amount);
  if (!input.title.trim()) throw new Error('اسم المصروف مطلوب');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('قيمة المصروف يجب أن تكون أكبر من صفر');
  const now = new Date();
  const no = nextExpenseNo(db);
  db.insert(expenses).values({
    no,
    at: now.toISOString(),
    time: now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    title: input.title.trim(),
    cat: input.cat || 'أخرى',
    person: input.person || '-',
    method: input.method || 'كاش من الدرج',
    amount,
  }).run();
  log.info('expense added', no, amount);
  return listExpenses(db).find((e) => e.no === no)!;
}

/** Hard delete + activity log (expenses are operational entries; sales stay append-only). */
export function deleteExpense(db: BetterSQLiteDatabase, no: string) {
  const row = db.select().from(expenses).where(eq(expenses.no, no)).get();
  if (!row) throw new Error(`المصروف ${no} غير موجود`);
  db.delete(expenses).where(eq(expenses.no, no)).run();
  log.info('expense deleted', no, row.amount);
  return { no, amount: row.amount, title: row.title };
}

export interface Financials {
  date: string;
  salesCount: number;
  salesTotal: number;
  salesSubtotal: number;
  salesDiscount: number;
  salesTip: number;
  cashSales: number;
  onlineSales: number;
  byMethod: Record<PayMethod, number>;
  expensesTotal: number;
  cashExpenses: number;
  commissions: number;
  netProfit: number;
  expectedDrawer: number;
}

const COMMISSION_RATE = 0.2; // DESIGN §6: net = sales − expenses − round(sales×20%)

export function financials(db: BetterSQLiteDatabase, dateKey?: string): Financials {
  const day = dateKey ?? new Date().toISOString().slice(0, 10);
  const salesRows = db.select().from(sales).all().filter((s) => s.at.slice(0, 10) === day);
  const expenseRows = db.select().from(expenses).all().filter((e) => (e.at || '').slice(0, 10) === day);

  const byMethod: Record<PayMethod, number> = { cash: 0, instapay: 0, vodafone: 0, visa: 0 };
  let salesTotal = 0, salesSubtotal = 0, salesDiscount = 0, salesTip = 0;
  for (const s of salesRows) {
    salesTotal += s.total;
    salesSubtotal += s.subtotal;
    salesDiscount += s.discount;
    salesTip += s.tip;
    const m = s.payMethod as PayMethod;
    if (m in byMethod) byMethod[m] += s.total;
  }
  const cashSales = byMethod.cash;
  const onlineSales = salesTotal - cashSales;
  const expensesTotal = expenseRows.reduce((sum, e) => sum + e.amount, 0);
  const cashExpenses = expenseRows.filter((e) => e.method === 'كاش من الدرج').reduce((sum, e) => sum + e.amount, 0);
  const commissions = Math.round(salesTotal * COMMISSION_RATE);
  const netProfit = salesTotal - expensesTotal - commissions;

  return {
    date: day,
    salesCount: salesRows.length,
    salesTotal, salesSubtotal, salesDiscount, salesTip,
    cashSales, onlineSales, byMethod,
    expensesTotal, cashExpenses,
    commissions,
    netProfit,
    expectedDrawer: cashSales - cashExpenses,
  };
}

export interface ZReport extends Financials {
  actualCash: number | null;
  difference: number | null;
  shiftLabel: string;
}

/** Z-report snapshot: totals + actual drawer count; difference = actual − expected (+زيادة / −عجز). */
export function zReport(db: BetterSQLiteDatabase, actualCash?: number, dateKey?: string): ZReport {
  const f = financials(db, dateKey);
  const actual = Number.isFinite(actualCash) ? Math.round(actualCash!) : null;
  const difference = actual === null ? null : actual - f.expectedDrawer;
  const report: ZReport = {
    ...f,
    actualCash: actual,
    difference,
    shiftLabel: `وردية ${new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}`,
  };
  if (difference !== null) {
    log.info('shift closed', { expected: f.expectedDrawer, actual, difference });
  }
  return report;
}
