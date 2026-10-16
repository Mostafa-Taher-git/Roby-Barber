// POS money engine — the ONLY place totals are computed (DESIGN doc §6/§7: UI never computes money).
// checkout() is transactional: sale insert + booking done + loyalty all-or-nothing.
import { eq } from 'drizzle-orm';
import { appointments, customers, sales, services, type BetterSQLiteDatabase } from '../db/schema';
import { log } from '../logger';

export type PayMethod = 'cash' | 'instapay' | 'vodafone' | 'visa';

export const PAY_LABELS: Record<PayMethod, string> = {
  cash: 'كاش نقدية',
  instapay: 'إنستاباي InstaPay',
  vodafone: 'فودافون كاش',
  visa: 'فيزا كارت',
};

export interface CartItem { id: string; title: string; qty: number }

export interface CheckoutInput {
  items: CartItem[];
  discount?: number;
  tip?: number;
  payMethod: PayMethod;
  ref?: string;
  barber: string;
  customer: string;
  bookingId?: string;
}

/** Pure money math: total = subtotal − discount + tip. Integer EGP only. */
export function totals(input: { subtotal: number; discount?: number; tip?: number }) {
  const subtotal = Math.max(0, Math.round(input.subtotal));
  const discount = Math.max(0, Math.round(input.discount ?? 0));
  const tip = Math.max(0, Math.round(input.tip ?? 0));
  if (discount > subtotal) throw new Error('الخصم أكبر من إجمالي الفاتورة');
  return { subtotal, discount, tip, total: subtotal - discount + tip };
}

/** Prices always come from DB rows (services or the booked appointment) — never from the UI. */
export function resolveItems(db: BetterSQLiteDatabase, items: CartItem[], bookingId?: string) {
  if (items.length === 0) throw new Error('الفاتورة فارغة — اختر خدمة أولاً');
  const booking = bookingId
    ? db.select().from(appointments).where(eq(appointments.id, bookingId)).get()
    : undefined;
  if (bookingId && !booking) throw new Error(`الحجز ${bookingId} غير موجود`);

  return items.map((it) => {
    const qty = Math.round(it.qty);
    if (!Number.isFinite(qty) || qty < 1) throw new Error('كمية غير صحيحة');
    const svc = db.select().from(services).where(eq(services.id, it.id)).get();
    if (svc) return { id: svc.id, title: svc.title, price: svc.price, qty };
    // Booking line that has no matching catalog service: the booked price is the source of truth.
    if (booking && it.title === booking.service) {
      return { id: `booking:${booking.id}`, title: booking.service, price: booking.price, qty };
    }
    throw new Error(`خدمة غير موجودة: ${it.title}`);
  });
}

export function nextReceiptNo(db: BetterSQLiteDatabase) {
  const count = db.select().from(sales).all().length;
  return `RB-${1000 + count + 1}`;
}

/** Atomic checkout: validate → insert sale → booking done → loyalty → activity log. Rolls back on any failure. */
export function checkout(db: BetterSQLiteDatabase, input: CheckoutInput) {
  const items = resolveItems(db, input.items, input.bookingId);
  if (!PAY_LABELS[input.payMethod]) throw new Error('طريقة دفع غير معروفة');
  const isCash = input.payMethod === 'cash';
  const ref = input.ref?.trim() ?? '';
  if (!isCash && !ref) throw new Error('رقم عملية التحويل مطلوب للدفع الإلكتروني');
  if (!input.customer.trim()) throw new Error('اسم الزبون مطلوب');

  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const t = totals({ subtotal, discount: input.discount, tip: input.tip });
  const receiptNo = nextReceiptNo(db);
  const at = new Date().toISOString();

  const sale = db.transaction((tx) => {
    tx.insert(sales).values({
      id: `sale_${receiptNo}`,
      receiptNo,
      itemsJson: JSON.stringify(items),
      subtotal: t.subtotal,
      discount: t.discount,
      tip: t.tip,
      total: t.total,
      payMethod: input.payMethod,
      ref: ref || null,
      barber: input.barber || '-',
      customer: input.customer.trim(),
      at,
    }).run();

    if (input.bookingId) {
      tx.update(appointments).set({ status: 'done' }).where(eq(appointments.id, input.bookingId)).run();
    }

    // Loyalty: 1 point per 10 EGP (only for registered customers)
    if (input.bookingId) {
      const appt = db.select().from(appointments).where(eq(appointments.id, input.bookingId)).get();
      const cust = appt ? db.select().from(customers).where(eq(customers.phone, appt.phone)).get() : undefined;
      if (cust) {
        const points = Number(cust.points) + Math.floor(t.total / 10);
        tx.update(customers).set({
          points,
          visits: Number(cust.visits) + 1,
          lastVisit: 'اليوم',
          vip: points >= 100 ? 1 : cust.vip,
        }).where(eq(customers.phone, cust.phone)).run();
      }
    }

    return tx.select().from(sales).where(eq(sales.receiptNo, receiptNo)).get()!;
  });

  log.info('checkout', receiptNo, t.total, input.payMethod);
  return { ...toReceipt(sale), payLabel: PAY_LABELS[input.payMethod] };
}

function toReceipt(row: typeof sales.$inferSelect) {
  return {
    receiptNo: row.receiptNo,
    at: row.at,
    items: JSON.parse(row.itemsJson) as { id: string; title: string; price: number; qty: number }[],
    subtotal: row.subtotal,
    discount: row.discount,
    tip: row.tip,
    total: row.total,
    payMethod: row.payMethod as PayMethod,
    ref: row.ref,
    barber: row.barber,
    customer: row.customer,
  };
}

export function recentSales(db: BetterSQLiteDatabase, limit = 50) {
  return db.select().from(sales).all()
    .sort((a, b) => (a.receiptNo < b.receiptNo ? 1 : -1))
    .slice(0, limit)
    .map((r) => ({ receiptNo: r.receiptNo, total: r.total, payMethod: r.payMethod as PayMethod, at: r.at, customer: r.customer, barber: r.barber }));
}
