// Typed renderer API surface (preload exposes window.roby.invoke). Keeps renderer free of direct DB access.
export interface Service { id: string; title: string; cat: string; price: number; duration: string; desc: string | null; }
export interface StaffMember { id: string; name: string; role: string; }
export interface Chair { id: number; num: number; barberId: string | null; status: string; customer: string; service: string; remMins: number; }
export interface Appt {
  id: string; name: string; phone: string; service: string; barber: string; time: string;
  status: 'waiting' | 'in_chair' | 'done'; payment: string; price: number;
}
export interface Customer { code: string; name: string; phone: string; visits: number; points: number; favBarber: string; lastVisit: string; vip: number; }

export type PayMethod = 'cash' | 'instapay' | 'vodafone' | 'visa';
export const PAY_LABELS: Record<PayMethod, string> = {
  cash: 'كاش نقدية', instapay: 'إنستاباي InstaPay', vodafone: 'فودافون كاش', visa: 'فيزا كارت',
};
export const CAT_LABELS: Record<string, string> = {
  hair: 'شعر', beard: 'لحية', skin: 'بشرة', packages: 'باكدجات', retail: 'منتجات',
};

export interface CartLine { id: string; title: string; price: number; qty: number; }
export interface CheckoutInput {
  items: { id: string; title: string; qty: number }[];
  discount?: number; tip?: number;
  payMethod: PayMethod; ref?: string;
  barber: string; customer: string; bookingId?: string;
}
export interface Receipt {
  receiptNo: string; at: string; items: CartLine[];
  subtotal: number; discount: number; tip: number; total: number;
  payMethod: PayMethod; payLabel: string; ref: string | null; barber: string; customer: string;
}

export interface Financials {
  date: string; salesCount: number; salesTotal: number; salesSubtotal: number;
  salesDiscount: number; salesTip: number; cashSales: number; onlineSales: number;
  byMethod: Record<PayMethod, number>;
  expensesTotal: number; cashExpenses: number; commissions: number;
  netProfit: number; expectedDrawer: number;
}
export interface ZReport extends Financials {
  actualCash: number | null; difference: number | null; shiftLabel: string;
}
export interface Expense { no: string; at: string; time: string; title: string; cat: string; person: string; method: string; amount: number; }
export interface ExpenseInput { title: string; amount: number; cat: string; person: string; method: string; }

export interface Salon {
  id: string; nameAr: string; address: string; phone: string;
  instapay: string; vodafone: string; logoPath: string | null; logoDataUrl: string | null;
}
export interface Template { id: string; kind: string; bodyAr: string; }
export interface Offer { id: string; title: string; descAr: string; price: number; active: number; }
export interface ServiceInput { id?: string; title: string; cat: string; price: number; duration: string; desc?: string | null; }

export interface RobyApi {
  overview(): Promise<{ todaySales: number; appointments: number; waiting: number; criticalStock: number; staff: number; lastBackup: string | null }>;
  chairs(): Promise<Chair[]>;
  appointments(filter?: 'all' | 'waiting' | 'in_chair' | 'done'): Promise<Appt[]>;
  waitingQueue(): Promise<Appt[]>;
  createBooking(input: { name: string; phone: string; service: string; barber: string; time: string; price: number; payment: string }): Promise<Appt>;
  seatBooking(id: string): Promise<Appt>;
  finishChair(chairId: number): Promise<Chair>;
  callNext(): Promise<void>;
  services(): Promise<Service[]>;
  staff(): Promise<StaffMember[]>;
  customers(query?: string): Promise<Customer[]>;
  logActivity(text: string): Promise<void>;
  activity(): Promise<{ text: string; time: string }[]>;

  checkout(input: CheckoutInput): Promise<Receipt>;
  sales(): Promise<{ receiptNo: string; total: number; payMethod: PayMethod; at: string; customer: string; barber: string }[]>;

  financials(dateKey?: string): Promise<Financials>;
  expenses(): Promise<Expense[]>;
  addExpense(input: ExpenseInput): Promise<Expense>;
  deleteExpense(no: string): Promise<{ no: string }>;
  zReport(actualCash?: number): Promise<ZReport>;

  salon(): Promise<Salon>;
  saveSalon(input: Partial<Salon>): Promise<Salon>;
  saveLogo(dataUrl: string): Promise<{ logoPath: string; logoDataUrl: string | null }>;
  resetLogo(): Promise<{ logoPath: null }>;
  saveService(input: ServiceInput): Promise<Service>;
  deleteService(id: string): Promise<{ id: string }>;
  templates(): Promise<Template[]>;
  saveTemplates(list: { id: string; bodyAr: string }[]): Promise<Template[]>;
  offers(onlyActive?: boolean): Promise<Offer[]>;
  saveOffer(input: Partial<Offer> & { title: string }): Promise<Offer>;
  deleteOffer(id: string): Promise<{ id: string }>;
}

export interface RobyBridge {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  version: string;
  phase: number;
}

declare global {
  interface Window { roby?: RobyBridge }
}
