import { and, eq, like, or } from 'drizzle-orm';
import { customers, services, type BetterSQLiteDatabase } from '../db/schema';

export function listServices(db: BetterSQLiteDatabase) {
  return db.select().from(services).all().map((s) => ({
    id: s.id, title: s.title, cat: s.cat, price: s.price, duration: s.duration, desc: s.desc,
  }));
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
