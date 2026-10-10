// Phase 1 seed — migrates legacy app.js defaultState counts into SQLite.
// Run: npm run seed (from apps-desktop). Safe to re-run: uses INSERT OR IGNORE.
import Database from 'better-sqlite3';
import path from 'node:path';

const file = process.env.ROBY_DB || path.join(process.cwd(), 'roby.seed.db');
const db = new Database(file);
db.pragma('journal_mode = WAL');

const exec = (sql: string) => db.exec(sql);
exec(`CREATE TABLE IF NOT EXISTS salon (id TEXT PRIMARY KEY, name_ar TEXT, address TEXT, phone TEXT, instapay TEXT, vodafone TEXT, logo_path TEXT)`);
exec(`CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, name_ar TEXT, role TEXT, comm_pct INTEGER, salary INTEGER, photo_path TEXT, deleted_at TEXT)`);
exec(`CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, title TEXT, cat TEXT, price INTEGER, duration TEXT, desc TEXT, deleted_at TEXT)`);
exec(`CREATE TABLE IF NOT EXISTS chairs (id INTEGER PRIMARY KEY, num INTEGER, barber_id TEXT, status TEXT, customer TEXT, service TEXT, rem_mins INTEGER)`);
exec(`CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, customer_name TEXT, phone TEXT, service TEXT, barber TEXT, time TEXT, status TEXT, payment TEXT, price INTEGER)`);
exec(`CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, name TEXT, type TEXT, cost INTEGER, price INTEGER, qty INTEGER, min_qty INTEGER)`);
exec(`CREATE TABLE IF NOT EXISTS customers (code TEXT PRIMARY KEY, name TEXT, phone TEXT, visits INTEGER, points INTEGER, fav_barber TEXT, last_visit TEXT, vip INTEGER)`);
exec(`CREATE TABLE IF NOT EXISTS expenses (no TEXT PRIMARY KEY, time TEXT, title TEXT, cat TEXT, person TEXT, method TEXT, amount INTEGER)`);

const ins = (table: string, cols: string[], rows: unknown[][]) => {
  const stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
  for (const r of rows) stmt.run(...(r as unknown[]));
};

ins('salon', ['id', 'name_ar', 'address', 'phone', 'instapay', 'vodafone'], [
  ['main', 'صالون روبي باربر للرجال', 'شارع جامعة الدول العربية - المهندسين، الجيزة', '01023456789', 'roby.barber@instapay', '01099887766'],
]);
ins('staff', ['id', 'name_ar', 'role', 'comm_pct', 'salary'], [
  ['ahmed', 'الأسطى أحمد خليل', 'كوافير محترف أول', 20, 5000],
  ['anwar', 'الأسطى أنور عسران', 'مصفف لحية وتدريج', 20, 5000],
  ['jasem', 'الأسطى جاسم كيتش', 'أخصائي بشرة وبخار', 20, 5000],
  ['roby', 'كابتن روبي باربر', 'الماستر باربر وصاحب الصالون', 10, 8000],
  ['ibrahim', 'الأسطى إبراهيم سعد', 'كوافير قصات حديثة وفيد', 25, 4500],
]);
ins('services', ['id', 'title', 'cat', 'price', 'duration'], [
  ['srv_1', 'قص شعر استايل وفيد + سشوار', 'hair', 120, '35 دقيقة'],
  ['srv_2', 'تظبيط وتحديد دقن بالموس والخيط', 'beard', 70, '20 دقيقة'],
  ['srv_3', 'كومبو شياكة: شعر + لحية كاملة', 'packages', 170, '50 دقيقة'],
  ['srv_4', 'تنظيف بشرة هيدرافاشيل وبخار', 'skin', 200, '40 دقيقة'],
  ['srv_5', 'ماسك فحم أسود', 'skin', 60, '15 دقيقة'],
  ['srv_6', 'فرد بروتين علاجي', 'hair', 450, '75 دقيقة'],
  ['srv_7', 'باقة العريس الملكية VIP', 'packages', 1200, '150 دقيقة'],
  ['srv_8', 'واكس شعر مات بريميوم', 'retail', 130, 'منتج بيع'],
  ['srv_9', 'زيت لحية بالروزماري', 'retail', 160, 'منتج بيع'],
]);
ins('chairs', ['id', 'num', 'barber_id', 'status', 'customer', 'service', 'rem_mins'], [
  [1, 1, 'ahmed', 'busy', 'م/ طارق عبد العزيز', 'قص شعر + تظبيط لحية', 10],
  [2, 2, 'anwar', 'free', '-', 'الكرسي شاغر وجاهز', 0],
  [3, 3, 'jasem', 'busy', 'د/ شريف رمزي', 'جلسة هيدرافاشيل وبخار', 25],
  [4, 4, 'roby', 'free', '-', 'متاح للحجز VIP', 0],
  [5, 5, 'ibrahim', 'free', '-', 'جاهز للزبون التالي', 0],
]);
ins('appointments', ['id', 'customer_name', 'phone', 'service', 'barber', 'time', 'status', 'payment', 'price'], [
  ['RB-1082', 'محمد طارق الشريف', '01012345678', 'كومبو شياكة (شعر + لحية)', 'الأسطى أحمد خليل', '04:00 م', 'waiting', 'إنستاباي', 170],
  ['RB-1083', 'حسام حسن الدالي', '01123456789', 'قص شعر وتدريج فيد', 'الأسطى إبراهيم سعد', '04:30 م', 'waiting', 'كاش', 120],
  ['RB-1084', 'طارق عبد العزيز', '01234567890', 'قص شعر + تظبيط لحية', 'الأسطى أحمد خليل', '03:30 م', 'in_chair', 'كاش', 170],
  ['RB-1085', 'د/ شريف رمزي', '01099881122', 'تنظيف بشرة هيدرافاشيل', 'الأسطى جاسم كيتش', '03:45 م', 'in_chair', 'فيزا', 200],
  ['RB-1080', 'كريم محمود يونس', '01511223344', 'باقة العريس الملكية', 'كابتن روبي باربر', '01:00 م', 'done', 'إنستاباي', 1200],
  ['RB-1081', 'عمر عثمان', '01044556677', 'حلاقة دقن وتحديد', 'الأسطى أنور عسران', '02:15 م', 'done', 'فودافون كاش', 70],
]);
ins('inventory', ['id', 'name', 'type', 'cost', 'price', 'qty', 'min_qty'], [
  ['inv_1', 'شمع وواكس شعر مات إيطالي', 'retail', 75, 130, 18, 10],
  ['inv_2', 'شفرات دوركو بلاتينيوم (باكت 100)', 'salon', 120, 0, 3, 8],
  ['inv_3', 'زيت لحية بالروزماري 50 مل', 'retail', 90, 160, 12, 5],
  ['inv_4', 'كريم سنفرة بالخوخ 1 كجم', 'salon', 85, 0, 2, 5],
  ['inv_5', 'فوط تواليت استعمال مرة واحدة', 'salon', 150, 0, 4, 10],
  ['inv_6', 'كولونيا بعد الحلاقة بالليمون', 'salon', 65, 0, 14, 6],
  ['inv_7', 'صبغة لحية بدون أمونيا', 'salon', 110, 180, 9, 6],
]);
ins('customers', ['code', 'name', 'phone', 'visits', 'points', 'fav_barber', 'last_visit', 'vip'], [
  ['CUST-301', 'محمد طارق الشريف', '01012345678', 14, 280, 'الأسطى أحمد خليل', 'اليوم', 1],
  ['CUST-302', 'حسام حسن الدالي', '01123456789', 6, 120, 'الأسطى إبراهيم سعد', 'منذ أسبوع', 0],
  ['CUST-303', 'د/ شريف رمزي', '01099881122', 22, 490, 'الأسطى جاسم كيتش', 'اليوم', 1],
  ['CUST-304', 'كريم محمود يونس', '01511223344', 8, 350, 'كابتن روبي باربر', 'اليوم', 1],
  ['CUST-305', 'أحمد علاء عبد القادر', '01299887766', 4, 80, 'الأسطى أنور عسران', 'منذ 3 أسابيع', 0],
]);
ins('expenses', ['no', 'time', 'title', 'cat', 'person', 'method', 'amount'], [
  ['EXP-101', '10:30 ص', 'بوفيه وشاي وسكر وقهوة', 'بوفيه وضيافة', 'كابتن روبي', 'كاش من الدرج', 180],
  ['EXP-102', '11:45 ص', 'كحول ومطهرات ومناديل', 'نظافة ومطهرات', 'الأسطى أنور', 'كاش من الدرج', 220],
  ['EXP-103', '01:15 م', 'شحن راوتر وكاميرات', 'فواتير وكهرباء', 'كابتن روبي', 'محفظة كاش', 280],
]);

const counts = (t: string) => (db.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as { c: number }).c;
console.log(JSON.stringify({
  salon: counts('salon'), staff: counts('staff'), services: counts('services'),
  chairs: counts('chairs'), appointments: counts('appointments'),
  inventory: counts('inventory'), customers: counts('customers'), expenses: counts('expenses'),
}));
