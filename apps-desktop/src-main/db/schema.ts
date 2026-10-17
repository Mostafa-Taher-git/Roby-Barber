// Phase 1 schema — mirrors DESIGN_SYSTEM_AND_MAPPING.md §5. Money = INTEGER EGP.
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export type BetterSQLiteDatabase = BetterSQLite3Database<Record<string, never>>;

export const salon = sqliteTable('salon', {
  id: text('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  instapay: text('instapay').notNull(),
  vodafone: text('vodafone').notNull(),
  logoPath: text('logo_path'),
});

export const staff = sqliteTable('staff', {
  id: text('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  role: text('role').notNull(),
  commPct: integer('comm_pct').notNull(),
  salary: integer('salary').notNull(),
  photoPath: text('photo_path'),
  deletedAt: text('deleted_at'),
});

export const services = sqliteTable('services', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  cat: text('cat').notNull(),
  price: integer('price').notNull(),
  duration: text('duration').notNull(),
  desc: text('desc'),
  deletedAt: text('deleted_at'),
});

export const chairs = sqliteTable('chairs', {
  id: integer('id').primaryKey(),
  num: integer('num').notNull(),
  barberId: text('barber_id'),
  status: text('status').notNull(), // free | busy
  customer: text('customer').notNull(),
  service: text('service').notNull(),
  remMins: integer('rem_mins').notNull(),
});

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  service: text('service').notNull(),
  barber: text('barber').notNull(),
  time: text('time').notNull(),
  status: text('status').notNull(), // waiting | in_chair | done
  payment: text('payment').notNull(),
  price: integer('price').notNull(),
});

export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // salon | retail
  cost: integer('cost').notNull(),
  price: integer('price').notNull(),
  qty: integer('qty').notNull(),
  minQty: integer('min_qty').notNull(),
  deletedAt: text('deleted_at'),
});

// Staff payroll extras (Phase 4): advances taken during a month are deducted from that month's net pay;
// payments are append-only (paid rows are never edited — a correction is a new advance/mistake fix, not history edit).
export const staffAdvances = sqliteTable('staff_advances', {
  id: text('id').primaryKey(),
  staffId: text('staff_id').notNull(),
  amount: integer('amount').notNull(),
  note: text('note').notNull(),
  at: text('at').notNull(),
});

export const staffPayments = sqliteTable('staff_payments', {
  id: text('id').primaryKey(),
  staffId: text('staff_id').notNull(),
  amount: integer('amount').notNull(),
  month: text('month').notNull(), // YYYY-MM
  at: text('at').notNull(),
});

export const customers = sqliteTable('customers', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  visits: integer('visits').notNull(),
  points: integer('points').notNull(),
  favBarber: text('fav_barber').notNull(),
  lastVisit: text('last_visit').notNull(),
  vip: integer('vip').notNull(),
});

export const expenses = sqliteTable('expenses', {
  no: text('no').primaryKey(),
  at: text('at').notNull(), // ISO datetime — required for per-day financials/Z-report
  time: text('time').notNull(),
  title: text('title').notNull(),
  cat: text('cat').notNull(),
  person: text('person').notNull(),
  method: text('method').notNull(),
  amount: integer('amount').notNull(),
});

export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  receiptNo: text('receipt_no').notNull().unique(),
  itemsJson: text('items_json').notNull(),
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').notNull(),
  tip: integer('tip').notNull(),
  total: integer('total').notNull(),
  payMethod: text('pay_method').notNull(),
  ref: text('ref'),
  barber: text('barber').notNull(),
  customer: text('customer').notNull(),
  at: text('at').notNull(),
});

export const licenses = sqliteTable('licenses', {
  machineId: text('machine_id').primaryKey(),
  key: text('key').notNull(),
  activatedAt: text('activated_at'),
  trialStartedAt: text('trial_started_at').notNull(),
  lastSeen: text('last_seen').notNull(),
  tamperedAt: text('tampered_at'),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(), // ticket | receipt | reminder | campaign
  bodyAr: text('body_ar').notNull(),
});

export const offers = sqliteTable('offers', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  descAr: text('desc_ar').notNull(),
  price: integer('price').notNull(),
  active: integer('active').notNull(), // 1 = shows on overview
});

export const activityLog = sqliteTable('activity_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  at: text('at').notNull(),
  text: text('text').notNull(),
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(), // e.g. contact_whatsapp
  value: text('value').notNull(),
});
