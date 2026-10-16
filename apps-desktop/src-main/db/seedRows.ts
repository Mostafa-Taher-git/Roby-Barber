// Shared seed rows — the single source used by the auto-seed on first launch AND the CLI check.
export interface SeedRow { table: string; cols: string; rows: unknown[][] }

export const SEED_ROWS: SeedRow[] = [
  { table: 'salon', cols: 'id, name_ar, address, phone, instapay, vodafone, logo_path', rows: [
    ['main', 'صالون روبي باربر للرجال', 'شارع جامعة الدول العربية - المهندسين، الجيزة', '01023456789', 'roby.barber@instapay', '01099887766', null],
  ]},
  { table: 'staff', cols: 'id, name_ar, role, comm_pct, salary, photo_path', rows: [
    ['ahmed', 'الأسطى أحمد خليل', 'كوافير محترف أول', 20, 5000, null],
    ['anwar', 'الأسطى أنور عسران', 'مصفف لحية وتدريج', 20, 5000, null],
    ['jasem', 'الأسطى جاسم كيتش', 'أخصائي بشرة وبخار', 20, 5000, null],
    ['roby', 'كابتن روبي باربر', 'الماستر باربر وصاحب الصالون', 10, 8000, null],
    ['ibrahim', 'الأسطى إبراهيم سعد', 'كوافير قصات حديثة وفيد', 25, 4500, null],
  ]},
  { table: 'services', cols: 'id, title, cat, price, duration, desc', rows: [
    ['srv_1', 'قص شعر استايل وفيد + سشوار', 'hair', 120, '35 دقيقة', 'قص وتدريج حديث مع غسيل وسشوار'],
    ['srv_2', 'تظبيط وتحديد دقن بالموس والخيط', 'beard', 70, '20 دقيقة', 'تحديد بموس شفرة ليزر + خيط'],
    ['srv_3', 'كومبو شياكة: شعر + لحية كاملة', 'packages', 170, '50 دقيقة', 'الباكيدج الأكثر طلباً'],
    ['srv_4', 'تنظيف بشرة هيدرافاشيل وبخار', 'skin', 200, '40 دقيقة', 'بخار + إزالة رؤوس سوداء + ماسك'],
    ['srv_5', 'ماسك فحم أسود لإزالة الدهون', 'skin', 60, '15 دقيقة', 'ماسك فحم كوري منقي للمسام'],
    ['srv_6', 'فرد بروتين / فيلر علاجي للشعر', 'hair', 450, '75 دقيقة', 'بروتين برازيلي زيرو فورمالين'],
    ['srv_7', 'باقة العريس الملكية (VIP Groom)', 'packages', 1200, '150 دقيقة', 'حلاقة + لحية + بخار + باديكير'],
    ['srv_8', 'واكس مثبت شعر مات بريميوم', 'retail', 130, 'منتج بيع', 'واكس احترافي ثبات قوي 150 مل'],
    ['srv_9', 'زيت لحية طبيعي بالروزماري', 'retail', 160, 'منتج بيع', 'مغذي بلحية برائحة العود 50 مل'],
  ]},
  { table: 'chairs', cols: 'id, num, barber_id, status, customer, service, rem_mins', rows: [
    [1, 1, 'ahmed', 'busy', 'م/ طارق عبد العزيز', 'قص شعر + تظبيط لحية', 10],
    [2, 2, 'anwar', 'free', '-', 'الكرسي شاغر وجاهز', 0],
    [3, 3, 'jasem', 'busy', 'د/ شريف رمزي', 'جلسة هيدرافاشيل وبخار', 25],
    [4, 4, 'roby', 'free', '-', 'متاح للحجز VIP', 0],
    [5, 5, 'ibrahim', 'free', '-', 'جاهز للزبون التالي', 0],
  ]},
  { table: 'appointments', cols: 'id, customer_name, phone, service, barber, time, status, payment, price', rows: [
    ['RB-1082', 'محمد طارق الشريف', '01012345678', 'كومبو شياكة (شعر + لحية)', 'الأسطى أحمد خليل', '04:00 م', 'waiting', 'إنستاباي', 170],
    ['RB-1083', 'حسام حسن الدالي', '01123456789', 'قص شعر وتدريج فيد', 'الأسطى إبراهيم سعد', '04:30 م', 'waiting', 'كاش', 120],
    ['RB-1084', 'طارق عبد العزيز', '01234567890', 'قص شعر + تظبيط لحية', 'الأسطى أحمد خليل', '03:30 م', 'in_chair', 'كاش', 170],
    ['RB-1085', 'د/ شريف رمزي', '01099881122', 'تنظيف بشرة هيدرافاشيل', 'الأسطى جاسم كيتش', '03:45 م', 'in_chair', 'فيزا', 200],
    ['RB-1080', 'كريم محمود يونس', '01511223344', 'باقة العريس الملكية', 'كابتن روبي باربر', '01:00 م', 'done', 'إنستاباي', 1200],
    ['RB-1081', 'عمر عثمان', '01044556677', 'حلاقة دقن وتحديد', 'الأسطى أنور عسران', '02:15 م', 'done', 'فودافون كاش', 70],
  ]},
  { table: 'inventory', cols: 'id, name, type, cost, price, qty, min_qty', rows: [
    ['inv_1', 'شمع وواكس شعر مات إيطالي', 'retail', 75, 130, 18, 10],
    ['inv_2', 'شفرات دوركو بلاتينيوم (باكت 100)', 'salon', 120, 0, 3, 8],
    ['inv_3', 'زيت لحية بالروزماري 50 مل', 'retail', 90, 160, 12, 5],
    ['inv_4', 'كريم سنفرة بالخوخ 1 كجم', 'salon', 85, 0, 2, 5],
    ['inv_5', 'فوط تواليت استعمال مرة واحدة', 'salon', 150, 0, 4, 10],
    ['inv_6', 'كولونيا وتونيك بعد الحلاقة', 'salon', 65, 0, 14, 6],
    ['inv_7', 'صبغة لحية بدون أمونيا بيجن', 'salon', 110, 180, 9, 6],
  ]},
  { table: 'customers', cols: 'code, name, phone, visits, points, fav_barber, last_visit, vip', rows: [
    ['CUST-301', 'محمد طارق الشريف', '01012345678', 14, 280, 'الأسطى أحمد خليل', 'اليوم', 1],
    ['CUST-302', 'حسام حسن الدالي', '01123456789', 6, 120, 'الأسطى إبراهيم سعد', 'منذ أسبوع', 0],
    ['CUST-303', 'د/ شريف رمزي', '01099881122', 22, 490, 'الأسطى جاسم كيتش', 'اليوم', 1],
    ['CUST-304', 'كريم محمود يونس', '01511223344', 8, 350, 'كابتن روبي باربر', 'اليوم', 1],
    ['CUST-305', 'أحمد علاء عبد القادر', '01299887766', 4, 80, 'الأسطى أنور عسران', 'منذ 3 أسابيع', 0],
  ]},
  { table: 'expenses', cols: 'no, at, time, title, cat, person, method, amount', rows: [
    ['EXP-101', '__TODAY__', '10:30 ص', 'بوفيه وشاي وسكر وقهوة', 'بوفيه وضيافة', 'كابتن روبي', 'كاش من الدرج', 180],
    ['EXP-102', '__TODAY__', '11:45 ص', 'كحول ومطهرات ومناديل ورق', 'نظافة ومطهرات', 'الأسطى أنور', 'كاش من الدرج', 220],
    ['EXP-103', '__TODAY__', '01:15 م', 'شحن راوتر وكاميرات مراقبة', 'فواتير وكهرباء', 'كابتن روبي', 'محفظة كاش', 280],
  ]},
  { table: 'templates', cols: 'id, kind, body_ar', rows: [
    ['tpl_ticket', 'ticket', 'أهلاً {name} 👋 تم تسجيل حجزك في {salon} الساعة {time}. نتشرف بخدمتك!'],
    ['tpl_receipt', 'receipt', 'شكراً لزيارتك {salon} 🌟 فاتورتك {receipt} بمبلغ {total} ج.م. في انتظارك دائماً!'],
    ['tpl_reminder', 'reminder', 'وحشتنا يا {name} ✂️ عندك {points} نقطة ولاء في {salon} — استبدلها في زيارتك القادمة.'],
    ['tpl_campaign', 'campaign', 'عرض خاص في {salon} 🎉 خصم على كومبو الشياكة (شعر + لحية) هذا الأسبوع. اسأل عنه!'],
  ]},
  { table: 'offers', cols: 'id, title, desc_ar, price, active', rows: [
    ['offer_1', 'خصم 20% على كومبو الشياكة', 'شعر + لحية كاملة بسعر مخفض أيام الأحد والثلاثاء', 136, 1],
    ['offer_2', 'باقة العريس الملكية 1000 ج.م', 'كل خدمات العريس (حلاقة + بشرة + باديكير) بدل 1200', 1000, 1],
    ['offer_3', 'واكس + زيت لحية بـ 250 ج.م', 'عرض منتجات: واكس مات احترافي + زيت روزماري', 250, 0],
  ]},
];

/** Minimal raw better-sqlite3 shape — works with db.$client (drizzle) or a plain Database instance. */
interface RawSqlite {
  prepare: (sql: string) => { get: (...a: unknown[]) => unknown; run: (...a: unknown[]) => unknown };
}

// Callers pass a raw better-sqlite3 Database, drizzle's $client, or a test double.
function asClient(db: unknown): RawSqlite {
  return db as RawSqlite;
}

const TODAY = '__TODAY__';

export function applySeed(db: unknown): Record<string, number> {
  const client = asClient(db);
  const result: Record<string, number> = {};
  for (const { table, cols, rows } of SEED_ROWS) {
    const placeholders = rows[0].map(() => '?').join(',');
    const stmt = client.prepare(`INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`);
    for (const r of rows) stmt.run(...r.map((v) => (v === TODAY ? new Date().toISOString() : v)));
    result[table] = rows.length;
  }
  return result;
}

/** For an existing DB that predates a table: seed it only when empty (never resurrect user-deleted rows). */
export function seedTableIfEmpty(db: unknown, table: string): boolean {
  const client = asClient(db);
  const count = (client.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
  if (count > 0) return false;
  const def = SEED_ROWS.find((r) => r.table === table);
  if (!def) return false;
  const placeholders = def.rows[0].map(() => '?').join(',');
  const stmt = client.prepare(`INSERT OR IGNORE INTO ${table} (${def.cols}) VALUES (${placeholders})`);
  for (const r of def.rows) stmt.run(...r.map((v) => (v === TODAY ? new Date().toISOString() : v)));
  return true;
}

export function isFreshDb(db: unknown): boolean {
  const row = asClient(db).prepare('SELECT COUNT(*) AS c FROM salon').get() as { c: number };
  return row.c === 0;
}
