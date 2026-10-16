import { and, eq, like, or } from 'drizzle-orm';
import { customers, services, staff, type BetterSQLiteDatabase } from '../db/schema';

export function listServices(db: BetterSQLiteDatabase) {
  return db.select().from(services).all()
    .filter((s) => !s.deletedAt)
    .map((s) => ({
      id: s.id, title: s.title, cat: s.cat, price: s.price, duration: s.duration, desc: s.desc,
    }));
}

export function listStaff(db: BetterSQLiteDatabase) {
  return db.select().from(staff).all()
    .filter((s) => !s.deletedAt)
    .map((s) => ({ id: s.id, name: s.nameAr, role: s.role }));
}

export interface ServiceInput {
  id?: string; title: string; cat: string; price: number; duration: string; desc?: string | null;
}

export function saveService(db: BetterSQLiteDatabase, input: ServiceInput) {
  const title = input.title.trim();
  if (!title) throw new Error('اسم الخدمة مطلوب');
  const price = Math.round(input.price);
  if (!Number.isFinite(price) || price < 0) throw new Error('سعر الخدمة غير صحيح');
  const duration = input.duration.trim() || '-';
  const desc = input.desc?.trim() ?? null;
  if (input.id) {
    const row = db.select().from(services).where(eq(services.id, input.id)).get();
    if (!row) throw new Error('الخدمة غير موجودة');
    db.update(services).set({ title, cat: input.cat, price, duration, desc }).where(eq(services.id, input.id)).run();
    return listServices(db).find((s) => s.id === input.id)!;
  }
  const id = `srv_${Date.now()}`;
  db.insert(services).values({ id, title, cat: input.cat || 'hair', price, duration, desc }).run();
  return listServices(db).find((s) => s.id === id)!;
}

/** Soft delete (DESIGN §1: destructive = soft-delete) — POS stops offering it, sales history keeps its name. */
export function deleteService(db: BetterSQLiteDatabase, id: string) {
  const row = db.select().from(services).where(eq(services.id, id)).get();
  if (!row) throw new Error('الخدمة غير موجودة');
  db.update(services).set({ deletedAt: new Date().toISOString() }).where(eq(services.id, id)).run();
  return { id };
}

export interface CustomerRow {
  code: string; name: string; phone: string; visits: number;
  points: number; favBarber: string; lastVisit: string; vip: number;
}

export function listCustomers(db: BetterSQLiteDatabase, query = ''): CustomerRow[] {
  const rows = db.select().from(customers).all();
  const q = query.trim();
  const filtered = q
    ? rows.filter((c) => c.name.includes(q) || c.phone.includes(q) || c.code.includes(q))
    : rows;
  return filtered.map((c) => ({
    code: c.code, name: c.name, phone: c.phone, visits: c.visits,
    points: c.points, favBarber: c.favBarber, lastVisit: c.lastVisit, vip: c.vip,
  }));
}

/** Loyalty: 1 point per 10 EGP spent; 100 points = VIP. */
export function bumpLoyalty(db: BetterSQLiteDatabase, phone: string, amount: number) {
  const c = db.select().from(customers).where(eq(customers.phone, phone)).get();
  if (!c) return null;
  const points = Number(c.points) + Math.floor(amount / 10);
  db.update(customers).set({
    points, visits: Number(c.visits) + 1, lastVisit: 'اليوم',
    vip: points >= 100 ? 1 : c.vip,
  }).where(eq(customers.phone, phone)).run();
  return points;
}
