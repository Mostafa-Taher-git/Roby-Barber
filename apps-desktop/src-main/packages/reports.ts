import { desc, eq, sql } from 'drizzle-orm';
import { activityLog, appointments, inventory, sales, staff, type BetterSQLiteDatabase } from '../db/schema';

/** Overview KPIs — real queries, never hardcoded (DESIGN doc §9 troubleshooting). */
export function overview(db: BetterSQLiteDatabase) {
  const today = new Date().toISOString().slice(0, 10);
  const salesRows = db.select().from(sales).all();
  const todaySales = salesRows.filter((s) => s.at.slice(0, 10) === today).reduce((sum, s) => sum + s.total, 0);
  const apptRows = db.select().from(appointments).all();
  const criticalStock = db.select().from(inventory).all()
    .filter((i) => Number(i.qty) <= Number(i.minQty)).length;
  return {
    todaySales,
    appointments: apptRows.length,
    waiting: apptRows.filter((a) => a.status === 'waiting').length,
    criticalStock,
    staff: db.select().from(staff).all().length,
    lastBackup: null as string | null,
  };
}

export function logActivity(db: BetterSQLiteDatabase, text: string) {
  db.insert(activityLog).values({ at: new Date().toISOString(), text }).run();
}

export function activity(db: BetterSQLiteDatabase, limit = 20) {
  return db.select().from(activityLog).orderBy(desc(activityLog.id)).limit(limit).all()
    .map((r) => ({ text: r.text, time: relativeAr(r.at) }));
}

function relativeAr(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.round(hrs / 24)} يوم`;
}
