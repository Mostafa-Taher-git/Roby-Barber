// Renderer-safe API: in Electron every call goes through window.roby.invoke (main owns DB).
// In a plain browser (vite dev preview) an in-memory fallback keeps the UI reviewable — no data is persisted.
import { useMemo } from 'react';
import {
  PAY_LABELS, type CheckoutInput, type Expense, type ExpenseInput, type Financials, type Offer,
  type Receipt, type RobyApi, type Salon, type Service, type ServiceInput, type Template, type ZReport,
} from './api';
import * as seed from './data/seed';

function electronApi(invoke: (channel: string, ...args: unknown[]) => Promise<unknown>): RobyApi {
  const call = async <T,>(channel: string, ...args: unknown[]): Promise<T> => {
    try {
      return (await invoke(channel, ...args)) as T;
    } catch (e) {
      // Electron wraps handler errors: "Error invoking remote method 'x': Error: <real message>"
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(msg.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, ''));
    }
  };
  return {
    overview: () => call('overview'),
    chairs: () => call('chairs'),
    appointments: (filter) => call('appointments', filter),
    waitingQueue: () => call('waiting-queue'),
    createBooking: (input) => call('create-booking', input),
    seatBooking: (id) => call('seat-booking', id),
    finishChair: (id) => call('finish-chair', id),
    callNext: () => call('call-next'),
    services: () => call('services'),
    staff: () => call('staff'),
    customers: (q) => call('customers', q),
    logActivity: (text) => call('log-activity', text),
    activity: () => call('activity'),

    checkout: (input) => call('checkout', input),
    sales: () => call('sales'),

    financials: (dateKey) => call('financials', dateKey),
    expenses: () => call('expenses'),
    addExpense: (input) => call('add-expense', input),
    deleteExpense: (no) => call('delete-expense', no),
    zReport: (actualCash) => call('z-report', actualCash),

    salon: () => call('salon'),
    saveSalon: (input) => call('save-salon', input),
    saveLogo: (dataUrl) => call('save-logo', dataUrl),
    resetLogo: () => call('reset-logo'),
    saveService: (input) => call('save-service', input),
    deleteService: (id) => call('delete-service', id),
    templates: () => call('templates'),
    saveTemplates: (list) => call('save-templates', list),
    offers: (onlyActive) => call('offers', onlyActive),
    saveOffer: (input) => call('save-offer', input),
    deleteOffer: (id) => call('delete-offer', id),
  };
}

// ---- Browser-preview fallback (no persistence) ----
type Mut = { sales: Receipt[]; expenses: Expense[]; salon: Salon; services: Service[]; templates: Template[]; offers: Offer[] };

function fallbackApi(): RobyApi {
  const m: Mut = {
    sales: [],
    expenses: [],
    salon: {
      id: 'main', nameAr: 'صالون روبي باربر للرجال', address: 'شارع جامعة الدول العربية - المهندسين، الجيزة',
      phone: '01023456789', instapay: 'roby.barber@instapay', vodafone: '01099887766', logoPath: null, logoDataUrl: null,
    },
    services: seed.services.map((s) => ({ ...s, desc: null })),
    templates: [],
    offers: [],
  };
  const previewFinancials = (): Financials => {
    const total = m.sales.reduce((s, r) => s + r.total, 0);
    const cash = m.sales.filter((r) => r.payMethod === 'cash').reduce((s, r) => s + r.total, 0);
    const exp = m.expenses.reduce((s, e) => s + e.amount, 0);
    const cashExp = m.expenses.filter((e) => e.method === 'كاش من الدرج').reduce((s, e) => s + e.amount, 0);
    return {
      date: new Date().toISOString().slice(0, 10), salesCount: m.sales.length, salesTotal: total,
      salesSubtotal: m.sales.reduce((s, r) => s + r.subtotal, 0), salesDiscount: 0, salesTip: m.sales.reduce((s, r) => s + r.tip, 0),
      cashSales: cash, onlineSales: total - cash, byMethod: { cash, instapay: 0, vodafone: 0, visa: total - cash },
      expensesTotal: exp, cashExpenses: cashExp, commissions: Math.round(total * 0.2),
      netProfit: total - exp - Math.round(total * 0.2), expectedDrawer: cash - cashExp,
    };
  };
  return {
    async overview() {
      return { todaySales: previewFinancials().salesTotal, appointments: seed.appointments.length, waiting: 2, criticalStock: 3, staff: 5, lastBackup: null };
    },
    async chairs() { return seed.chairs; },
    async appointments(f = 'all') { return (f === 'all' ? seed.appointments : seed.appointments.filter((a) => a.status === f)) as seed.Appt[] as never; },
    async waitingQueue() { return seed.appointments.filter((a) => a.status === 'waiting') as never; },
    async createBooking(input) { return { id: `RB-${Math.floor(1000 + Math.random() * 9000)}`, status: 'waiting', ...input } as never; },
    async seatBooking(id) { return seed.appointments.find((a) => a.id === id) as never; },
    async finishChair() { return seed.chairs[0] as never; },
    async callNext() {},
    async services() { return m.services; },
    async staff() { return seed.chairs.map((c) => ({ id: c.barberId ?? String(c.id), name: `الأسطى ${c.barberId}`, role: 'barber' })); },
    async customers() { return []; },
    async logActivity() {},
    async activity() { return []; },
    async checkout(input: CheckoutInput) {
      const items = input.items.map((it) => {
        const s = m.services.find((x) => x.id === it.id);
        return { id: it.id, title: s?.title ?? it.title, price: s?.price ?? 0, qty: it.qty };
      });
      const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
      const discount = input.discount ?? 0;
      const tip = input.tip ?? 0;
      if (discount > subtotal) throw new Error('الخصم أكبر من إجمالي الفاتورة');
      if (input.payMethod !== 'cash' && !input.ref?.trim()) throw new Error('رقم عملية التحويل مطلوب للدفع الإلكتروني');
      const receipt: Receipt = {
        receiptNo: `RB-${1000 + m.sales.length + 1}`, at: new Date().toISOString(), items,
        subtotal, discount, tip, total: subtotal - discount + tip,
        payMethod: input.payMethod, payLabel: PAY_LABELS[input.payMethod], ref: input.ref ?? null,
        barber: input.barber, customer: input.customer,
      };
      m.sales.push(receipt);
      return receipt;
    },
    async sales() {
      return m.sales.map((r) => ({ receiptNo: r.receiptNo, total: r.total, payMethod: r.payMethod, at: r.at, customer: r.customer, barber: r.barber }));
    },
    async financials() { return previewFinancials(); },
    async expenses() { return m.expenses; },
    async addExpense(input: ExpenseInput) {
      const row: Expense = {
        no: `EXP-${101 + m.expenses.length}`, at: new Date().toISOString(),
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        ...input,
      };
      m.expenses.unshift(row);
      return row;
    },
    async deleteExpense(no) {
      const i = m.expenses.findIndex((e) => e.no === no);
      if (i >= 0) m.expenses.splice(i, 1);
      return { no };
    },
    async zReport(actualCash?: number): Promise<ZReport> {
      const f = previewFinancials();
      const actual = Number.isFinite(actualCash) ? Math.round(actualCash!) : null;
      return { ...f, actualCash: actual, difference: actual === null ? null : actual - f.expectedDrawer, shiftLabel: 'وردية المعاينة' };
    },
    async salon() { return m.salon; },
    async saveSalon(input) { m.salon = { ...m.salon, ...input }; return m.salon; },
    async saveLogo(dataUrl) { m.salon.logoDataUrl = dataUrl; return { logoPath: 'preview', logoDataUrl: dataUrl }; },
    async resetLogo() { m.salon.logoDataUrl = null; return { logoPath: null }; },
    async saveService(input: ServiceInput) {
      const s: Service = { id: input.id ?? `srv_${Date.now()}`, title: input.title, cat: input.cat, price: input.price, duration: input.duration, desc: input.desc ?? null };
      const i = m.services.findIndex((x) => x.id === s.id);
      if (i >= 0) m.services[i] = s; else m.services.push(s);
      return s;
    },
    async deleteService(id) { m.services = m.services.filter((s) => s.id !== id); return { id }; },
    async templates() { return m.templates; },
    async saveTemplates(list) { m.templates = m.templates.map((t) => ({ ...t, bodyAr: list.find((l) => l.id === t.id)?.bodyAr ?? t.bodyAr })); return m.templates; },
    async offers(onlyActive) { return onlyActive ? m.offers.filter((o) => o.active === 1) : m.offers; },
    async saveOffer(input) {
      const o: Offer = { id: input.id ?? `offer_${Date.now()}`, title: input.title, descAr: input.descAr ?? '', price: input.price ?? 0, active: input.active ?? 1 };
      const i = m.offers.findIndex((x) => x.id === o.id);
      if (i >= 0) m.offers[i] = o; else m.offers.push(o);
      return o;
    },
    async deleteOffer(id) { m.offers = m.offers.filter((o) => o.id !== id); return { id }; },
  };
}

export function useApi(): RobyApi {
  return useMemo(() => (typeof window !== 'undefined' && window.roby?.invoke ? electronApi(window.roby.invoke.bind(window.roby)) : fallbackApi()), []);
}
