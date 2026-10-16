// Inventory DB-facing module — CRUD + restock (qty += n, logged by the IPC layer) + levels payload.
import { eq } from 'drizzle-orm';
import { inventory, type BetterSQLiteDatabase } from '../../db/schema';
import { stockLevels, type StockItem } from './levels';

function activeItems(db: BetterSQLiteDatabase): StockItem[] {
  return db.select().from(inventory).all()
    .filter((i) => !i.deletedAt)
    .map((i) => ({ id: i.id, name: i.name, type: i.type, cost: i.cost, price: i.price, qty: i.qty, minQty: i.minQty }));
}

/** S6 payload: rows + KPI levels computed in main (UI never sums money). */
export function inventoryPage(db: BetterSQLiteDatabase) {
  const items = activeItems(db);
  return { items, levels: stockLevels(items) };
}

export interface StockInput {
  id?: string; name: string; type: string; cost: number; price: number; qty: number; minQty: number;
}

export function saveStockItem(db: BetterSQLiteDatabase, input: StockInput) {
  const name = input.name.trim();
  if (!name) throw new Error('اسم الصنف مطلوب');
  const type = input.type === 'retail' ? 'retail' : 'salon';
  const cost = Math.round(input.cost);
  const price = Math.round(input.price);
  const qty = Math.round(input.qty);
  const minQty = Math.round(input.minQty);
  if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(price) || price < 0) throw new Error('سعر التكلفة/البيع غير صحيح');
  if (!Number.isFinite(qty) || qty < 0) throw new Error('الكمية غير صحيحة');
  if (!Number.isFinite(minQty) || minQty < 0) throw new Error('حد الطلب غير صحيح');
  if (input.id) {
    const row = db.select().from(inventory).where(eq(inventory.id, input.id)).get();
    if (!row || row.deletedAt) throw new Error('الصنف غير موجود');
    db.update(inventory).set({ name, type, cost, price, qty, minQty }).where(eq(inventory.id, input.id)).run();
    return activeItems(db).find((i) => i.id === input.id)!;
  }
  const id = `inv_${Date.now()}`;
  db.insert(inventory).values({ id, name, type, cost, price, qty, minQty }).run();
  return activeItems(db).find((i) => i.id === id)!;
}

/** Soft delete (DESIGN §5) — old restock/sale references stay readable. */
export function deleteStockItem(db: BetterSQLiteDatabase, id: string) {
  const row = db.select().from(inventory).where(eq(inventory.id, id)).get();
  if (!row || row.deletedAt) throw new Error('الصنف غير موجود');
  db.update(inventory).set({ deletedAt: new Date().toISOString() }).where(eq(inventory.id, id)).run();
  return { id, name: row.name };
}

export function restockItem(db: BetterSQLiteDatabase, id: string, qty: number) {
  const row = db.select().from(inventory).where(eq(inventory.id, id)).get();
  if (!row || row.deletedAt) throw new Error('الصنف غير موجود');
  const add = Math.round(qty);
  if (!Number.isFinite(add) || add <= 0) throw new Error('كمية التوريد يجب أن تكون أكبر من صفر');
  const next = row.qty + add;
  db.update(inventory).set({ qty: next }).where(eq(inventory.id, id)).run();
  return { id, name: row.name, added: add, qty: next };
}

/** Stock value summary for the overview (S1 inventory bars). */
export function stockOverview(db: BetterSQLiteDatabase) {
  const items = activeItems(db);
  return { ...stockLevels(items) };
}
