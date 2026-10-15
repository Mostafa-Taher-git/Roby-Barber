// Queue state machine — single place enforcing waiting -> in_chair -> done (DESIGN doc §6).
import { and, eq } from 'drizzle-orm';
import { log } from '../logger';
import { appointments, chairs, type BetterSQLiteDatabase } from '../db/schema';

export function listAppointments(db: BetterSQLiteDatabase, status?: string) {
  const rows = db.select().from(appointments).all();
  const list = rows.map(toAppt);
  return status && status !== 'all' ? list.filter((a) => a.status === status) : list;
}

export function listChairs(db: BetterSQLiteDatabase) {
  return db.select().from(chairs).all().map((c) => ({
    id: c.id, num: c.num, barberId: c.barberId, status: c.status,
    customer: c.customer, service: c.service, remMins: c.remMins,
  }));
}

function toAppt(r: typeof appointments.$inferSelect) {
  return {
    id: r.id, name: r.customerName, phone: r.phone, service: r.service, barber: r.barber,
    time: r.time, status: r.status as 'waiting' | 'in_chair' | 'done', payment: r.payment, price: r.price,
  };
}

export function createBooking(db: BetterSQLiteDatabase, input: {
  name: string; phone: string; service: string; barber: string; time: string; price: number; payment: string;
}) {
  const id = `RB-${Math.floor(1000 + Math.random() * 9000)}`;
  db.insert(appointments).values({
    id, customerName: input.name, phone: input.phone, service: input.service,
    barber: input.barber, time: input.time, status: 'waiting',
    payment: input.payment || 'كاش', price: input.price,
  }).run();
  log.info('booking created', id, input.name);
  return listAppointments(db, 'waiting').find((a) => a.id === id)!;
}

/** Seat a waiting booking onto the first free chair. No skips: only waiting can be seated. */
export function seatBooking(db: BetterSQLiteDatabase, id: string) {
  const appt = db.select().from(appointments).where(eq(appointments.id, id)).get();
  if (!appt) throw new Error(`booking ${id} not found`);
  if (appt.status !== 'waiting') throw new Error(`cannot seat booking in status ${appt.status}`);

  const free = db.select().from(chairs).where(eq(chairs.status, 'free')).all()[0];
  if (!free) throw new Error('all chairs busy');

  db.update(appointments).set({ status: 'in_chair' }).where(eq(appointments.id, id)).run();
  db.update(chairs).set({
    status: 'busy', customer: appt.customerName, service: appt.service, remMins: 35,
    barberId: free.barberId,
  }).where(eq(chairs.id, free.id)).run();
  log.info('booking seated', id, 'chair', free.num);
  return listAppointments(db).find((a) => a.id === id)!;
}

/** Seat the oldest waiting booking — barber clicks one button. */
export function seatNextWaiting(db: BetterSQLiteDatabase) {
  const next = db.select().from(appointments).where(eq(appointments.status, 'waiting')).all()
    .sort((a, b) => (a.id < b.id ? -1 : 1))[0];
  return next ? seatBooking(db, next.id) : null;
}

/** Finish a busy chair: frees chair, keeps booking in_chair until POS checkout (Phase 3) marks it done. */
export function finishChair(db: BetterSQLiteDatabase, chairId: number) {
  const chair = db.select().from(chairs).where(eq(chairs.id, chairId)).get();
  if (!chair) throw new Error(`chair ${chairId} not found`);
  if (chair.status === 'free') throw new Error('chair already free');
  db.update(chairs).set({ status: 'free', customer: '-', service: 'الكرسي شاغر وجاهز', remMins: 0 })
    .where(eq(chairs.id, chairId)).run();
  log.info('chair finished', chairId);
  return listChairs(db).find((c) => c.id === chairId)!;
}
