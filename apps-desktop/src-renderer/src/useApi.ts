// Renderer-safe API: in Electron every call goes through window.roby.invoke (main owns DB).
// In a plain browser (vite dev preview) an in-memory fallback keeps the UI reviewable — no data is persisted.
import { useMemo } from 'react';
import {
  PAY_LABELS, type Advance, type CheckoutInput, type Expense, type ExpenseInput, type Financials,
  type LicenseState, type Offer, type PayrollSummary, type Receipt, type RobyApi, type Salon, type Service, type ServiceInput,
  type StaffFull, type StockItem, type StockLevels, type StockPageData, type Template, type ZReport,
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

    staffRoster: () => call('staff-roster'),
    payroll: (month) => call('payroll', month),
    saveStaff: (input) => call('save-staff', input),
    deleteStaff: (id) => call('delete-staff', id),
    addAdvance: (staffId, amount, note) => call('add-advance', staffId, amount, note),
    deleteAdvance: (id) => call('delete-advance', id),
    payStaff: (staffId, month) => call('pay-staff', staffId, month),

    inventory: () => call('inventory'),
    saveStock: (input) => call('save-stock', input),
    deleteStock: (id) => call('delete-stock', id),
    restock: (id, qty) => call('restock', id, qty),

    licenseState: () => call('license-state'),
    activate: (key) => call('activate', key),
  };
}

// ---- Browser-preview fallback (no persistence) ----
type Mut = {
  sales: Receipt[]; expenses: Expense[]; salon: Salon; services: Service[]; templates: Template[]; offers: Offer[];
  staff: StaffFull[]; advances: Advance[]; payments: { id: string; staffId: string; amount: number; month: string; at: string }[];
  stock: StockItem[];
};

const monthOf = (iso: string) => iso.slice(0, 7);

const FALLBACK_STOCK: StockItem[] = [
  { id: 'inv_1', name: 'شمع وواكس شعر مات إيطالي', type: 'retail', cost: 75, price: 130, qty: 18, minQty: 10 },
  { id: 'inv_2', name: 'شفرات دوركو بلاتينيوم (باكت 100)', type: 'salon', cost: 120, price: 0, qty: 3, minQty: 8 },
  { id: 'inv_3', name: 'زيت لحية بالروزماري 50 مل', type: 'retail', cost: 90, price: 160, qty: 12, minQty: 5 },
  { id: 'inv_4', name: 'كريم سنفرة بالخوخ 1 كجم', type: 'salon', cost: 85, price: 0, qty: 2, minQty: 5 },
  { id: 'inv_5', name: 'فوط تواليت استعمال مرة واحدة', type: 'salon', cost: 150, price: 0, qty: 4, minQty: 10 },
  { id: 'inv_6', name: 'كولونيا وتونيك بعد الحلاقة', type: 'salon', cost: 65, price: 0, qty: 14, minQty: 6 },
  { id: 'inv_7', name: 'صبغة لحية بدون أمونيا بيجن', type: 'salon', cost: 110, price: 180, qty: 9, minQty: 6 },
];

function fallbackLevels(items: StockItem[]): StockLevels {
  const critical = items.filter((i) => i.qty <= i.minQty);
  return {
    count: items.length,
    salonCount: items.filter((i) => i.type === 'salon').length,
    retailCount: items.filter((i) => i.type === 'retail').length,
    criticalCount: critical.length,
    costValue: items.reduce((s, i) => s + i.cost * i.qty, 0),
    retailValue: items.reduce((s, i) => s + (i.price > 0 ? i.price * i.qty : 0), 0),
    criticalItems: critical.map((i) => ({ id: i.id, name: i.name, qty: i.qty, minQty: i.minQty })),
  };
}

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
    staff: [
      { id: 'ahmed', nameAr: 'الأسطى أحمد خليل', role: 'كوافير محترف أول', commPct: 20, salary: 5000, photoPath: null },
      { id: 'anwar', nameAr: 'الأسطى أنور عسران', role: 'مصفف لحية وتدريج', commPct: 20, salary: 5000, photoPath: null },
      { id: 'jasem', nameAr: 'الأسطى جاسم كيتش', role: 'أخصائي بشرة وبخار', commPct: 20, salary: 5000, photoPath: null },
      { id: 'roby', nameAr: 'كابتن روبي باربر', role: 'الماستر باربر وصاحب الصالون', commPct: 10, salary: 8000, photoPath: null },
      { id: 'ibrahim', nameAr: 'الأسطى إبراهيم سعد', role: 'كوافير قصات حديثة وفيد', commPct: 25, salary: 4500, photoPath: null },
    ],
    advances: [{ id: 'ADV-101', staffId: 'ahmed', amount: 200, note: 'سلفة شخصية', at: new Date().toISOString() }],
    payments: [],
    stock: FALLBACK_STOCK.map((i) => ({ ...i })),
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
  const previewPayroll = (month: string): PayrollSummary => {
    const items = m.staff.map((s) => {
      const rows = m.sales.filter((r) => monthOf(r.at) === month && r.barber === s.nameAr);
      const revenue = rows.reduce((t, r) => t + r.subtotal - r.discount, 0);
      const tips = rows.reduce((t, r) => t + r.tip, 0);
      const commission = Math.round((revenue * s.commPct) / 100);
      const advancesList = m.advances.filter((a) => a.staffId === s.id && monthOf(a.at) === month);
      const advancesTotal = advancesList.reduce((t, a) => t + a.amount, 0);
      const pay = m.payments.find((p) => p.staffId === s.id && p.month === month) ?? null;
      return {
        staffId: s.id, nameAr: s.nameAr, role: s.role, commPct: s.commPct, salary: s.salary, photoPath: s.photoPath,
        month, revenue, count: rows.length, tips, commission, advancesTotal, advancesList,
        net: s.salary + commission + tips - advancesTotal,
        paid: pay ? { id: pay.id, amount: pay.amount, at: pay.at } : null,
      };
    });
    const totals = items.reduce(
      (acc, it) => ({
        salary: acc.salary + it.salary, revenue: acc.revenue + it.revenue, commission: acc.commission + it.commission,
        tips: acc.tips + it.tips, advances: acc.advances + it.advancesTotal, net: acc.net + it.net,
      }),
      { salary: 0, revenue: 0, commission: 0, tips: 0, advances: 0, net: 0 },
    );
    return { month, items, totals };
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
    async staff() { return m.staff.map((s) => ({ id: s.id, name: s.nameAr, role: s.role })); },
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

    async staffRoster() { return m.staff; },
    async payroll(month) { return previewPayroll(month ?? new Date().toISOString().slice(0, 7)); },
    async saveStaff(input) {
      const row: StaffFull = {
        id: input.id ?? `stf_${Date.now()}`, nameAr: input.nameAr, role: input.role,
        commPct: input.commPct, salary: input.salary, photoPath: null, photoDataUrl: input.photoDataUrl ?? null,
      };
      const i = m.staff.findIndex((s) => s.id === row.id);
      if (i >= 0) m.staff[i] = row; else m.staff.push(row);
      return row;
    },
    async deleteStaff(id) {
      const row = m.staff.find((s) => s.id === id);
      m.staff = m.staff.filter((s) => s.id !== id);
      return { id, nameAr: row?.nameAr ?? '' };
    },
    async addAdvance(staffId, amount, note) {
      if (!m.staff.some((s) => s.id === staffId)) throw new Error('الأسطى غير موجود');
      if (Math.round(amount) <= 0) throw new Error('قيمة السلفة يجب أن تكون أكبر من صفر');
      const adv: Advance = { id: `ADV-${101 + m.advances.length}`, staffId, amount: Math.round(amount), note: note || 'سلفة', at: new Date().toISOString() };
      m.advances.push(adv);
      return adv;
    },
    async deleteAdvance(id) {
      const adv = m.advances.find((a) => a.id === id);
      if (!adv) throw new Error('السلفة غير موجودة');
      m.advances = m.advances.filter((a) => a.id !== id);
      return { id, staffId: adv.staffId, amount: adv.amount };
    },
    async payStaff(staffId, month) {
      const item = previewPayroll(month).items.find((s) => s.staffId === staffId);
      if (!item) throw new Error('الأسطى غير موجود');
      if (item.paid) throw new Error('تم صرف مرتب هذا الشهر بالفعل');
      if (item.net <= 0) throw new Error('صافي المستحق غير موجب — راجع السلف المسجلة');
      const payment = { id: `pay_${Date.now()}`, staffId, amount: item.net, month, at: new Date().toISOString() };
      m.payments.push(payment);
      return { ...payment, nameAr: item.nameAr };
    },

    async inventory(): Promise<StockPageData> { return { items: m.stock, levels: fallbackLevels(m.stock) }; },
    async saveStock(input) {
      const row: StockItem = {
        id: input.id ?? `inv_${Date.now()}`, name: input.name, type: input.type,
        cost: input.cost, price: input.price, qty: input.qty, minQty: input.minQty,
      };
      const i = m.stock.findIndex((x) => x.id === row.id);
      if (i >= 0) m.stock[i] = row; else m.stock.push(row);
      return row;
    },
    async deleteStock(id) {
      const row = m.stock.find((x) => x.id === id);
      m.stock = m.stock.filter((x) => x.id !== id);
      return { id, name: row?.name ?? '' };
    },
    async restock(id, qty) {
      const row = m.stock.find((x) => x.id === id);
      if (!row) throw new Error('الصنف غير موجود');
      if (Math.round(qty) <= 0) throw new Error('كمية التوريد يجب أن تكون أكبر من صفر');
      row.qty += Math.round(qty);
      return { id, name: row.name, added: Math.round(qty), qty: row.qty };
    },

    // Preview is always "active" — the lock/trial flow only exists in the real app.
    async licenseState(): Promise<LicenseState> {
      return { status: 'active', mid: 'MID-0000-0000', daysLeft: null, activatedAt: null, reason: null, ownerWhatsApp: '201000000000' };
    },
    async activate(): Promise<LicenseState> { return this.licenseState(); },
  };
}

export function useApi(): RobyApi {
  return useMemo(() => (typeof window !== 'undefined' && window.roby?.invoke ? electronApi(window.roby.invoke.bind(window.roby)) : fallbackApi()), []);
}
