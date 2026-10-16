// Phase 3 smoke test — money flow against real SQLite: 10 mixed-payment sales must balance to the pound,
// expenses reduce the drawer correctly, Z-report exact, checkout atomic + loyalty + price-from-DB.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../src-main/db/clientTest';

const file = path.join(os.tmpdir(), `roby-smoke3-${Date.now()}.db`);
fs.rmSync(file, { recursive: true, force: true });

const db = build(file);
let pass = 0, fail = 0;
const check = (label: string, cond: boolean) => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); } else { fail++; console.log(`  FAIL  ${label}`); }
};
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };

console.log('P3-1 pure totals math');
check('1000 - 50 + 30 = 980', db.totals({ subtotal: 1000, discount: 50, tip: 30 }).total === 980);
check('discount > subtotal throws', throws(() => db.totals({ subtotal: 100, discount: 150 })));
check('negative tip clamps to 0', db.totals({ subtotal: 100, tip: -20 }).tip === 0);
check('fractional rounds per component: round(100.4)-round(0.6)=99', db.totals({ subtotal: 100.4, discount: 0.6 }).total === 99);

console.log('P3-2 ref# required for electronic payment (no insert on failure)');
const before = Number(db.prepare('SELECT COUNT(*) c FROM sales').get()!.c);
check('instapay without ref throws', throws(() => db.checkout({ items: [{ id: 'srv_1', title: 'قص', qty: 1 }], payMethod: 'instapay', barber: 'أ', customer: 'زبون' })));
check('sales count unchanged', Number(db.prepare('SELECT COUNT(*) c FROM sales').get()!.c) === before);

console.log('P3-3 ten mixed-payment sales balance to the pound');
const salesPlan: { id: string; title: string; qty: number; method: 'cash' | 'instapay' | 'vodafone' | 'visa'; ref?: string }[] = [
  { id: 'srv_3', title: 'كومبو شياكة', qty: 1, method: 'cash' },
  { id: 'srv_1', title: 'قص شعر', qty: 1, method: 'cash' },
  { id: 'srv_2', title: 'تظبيط دقن', qty: 1, method: 'cash' },
  { id: 'srv_3', title: 'كومبو شياكة', qty: 1, method: 'instapay', ref: 'REF-1' },
  { id: 'srv_7', title: 'باقة العريس', qty: 1, method: 'instapay', ref: 'REF-2' },
  { id: 'srv_4', title: 'هيدرافاشيل', qty: 1, method: 'instapay', ref: 'REF-3' },
  { id: 'srv_5', title: 'ماسك فحم', qty: 1, method: 'vodafone', ref: 'REF-4' },
  { id: 'srv_8', title: 'واكس', qty: 1, method: 'vodafone', ref: 'REF-5' },
  { id: 'srv_6', title: 'فرد بروتين', qty: 1, method: 'visa', ref: 'REF-6' },
  { id: 'srv_4', title: 'هيدرافاشيل', qty: 1, method: 'visa', ref: 'REF-7' },
];
const receipts = salesPlan.map((p, i) =>
  db.checkout({ items: [{ id: p.id, title: p.title, qty: p.qty }], payMethod: p.method, ref: p.ref, barber: 'الأسطى أحمد', customer: `زبون ${i + 1}` }));
check('10 receipts issued', receipts.length === 10);
check('receipt numbers unique', new Set(receipts.map((r) => r.receiptNo)).size === 10);
check('first receipt RB-1001', receipts[0].receiptNo === 'RB-1001');
check('last receipt RB-1010', receipts[9].receiptNo === 'RB-1010');
// Expected: 170+120+70 +170+1200+200 +60+130 +450+200 = 2770
const EXPECT_TOTAL = 2770, EXPECT_CASH = 360, EXPECT_INSTA = 1570, EXPECT_VODA = 190, EXPECT_VISA = 650;
const f = db.financials();
check('sales count = 10', f.salesCount === 10);
check('sales total = 2770', f.salesTotal === EXPECT_TOTAL);
check('cash = 360', f.cashSales === EXPECT_CASH);
check('instapay = 1570', f.byMethod.instapay === EXPECT_INSTA);
check('vodafone = 190', f.byMethod.vodafone === EXPECT_VODA);
check('visa = 650', f.byMethod.visa === EXPECT_VISA);
check('online = total - cash', f.onlineSales === EXPECT_TOTAL - EXPECT_CASH);
check('byMethod sums to total', f.byMethod.cash + f.byMethod.instapay + f.byMethod.vodafone + f.byMethod.visa === f.salesTotal);
check('commissions = round(20%) 554', f.commissions === Math.round(EXPECT_TOTAL * 0.2));

console.log('P3-4 one sale with tip + discount (math through checkout)');
const r11 = db.checkout({ items: [{ id: 'srv_8', title: 'واكس', qty: 2 }], discount: 30, tip: 20, payMethod: 'cash', barber: 'الأسطى أحمد', customer: 'زبون إكرامية' });
check('subtotal 260', r11.subtotal === 260);
check('total = 260 - 30 + 20 = 250', r11.total === 250);

console.log('P3-5 expenses reduce drawer + financials');
const e1 = db.addExpense({ title: 'كحول ومطهرات', amount: 100, cat: 'نظافة ومطهرات', person: 'أنور', method: 'كاش من الدرج' });
const e2 = db.addExpense({ title: 'شحن راوتر', amount: 50, cat: 'فواتير وكهرباء', person: 'روبي', method: 'إنستاباي' });
check('expense numbering continues after seed (EXP-104)', e1.no === 'EXP-104');
check('second expense EXP-105', e2.no === 'EXP-105');
check('zero-amount expense rejected', throws(() => db.addExpense({ title: 'بند', amount: 0, cat: 'أخرى', person: '-', method: 'كاش من الدرج' })));
const f2 = db.financials();
check('expenses total = seed 680 + 150', f2.expensesTotal === 680 + 150);
check('cash expenses = seed 400 + 100', f2.cashExpenses === 400 + 100);
check('expected drawer = cash sales - cash expenses', f2.expectedDrawer === f2.cashSales - f2.cashExpenses);
db.deleteExpense(e2.no);
check('delete removes expense', db.financials().expensesTotal === 680 + 100);

console.log('P3-6 Z-report close shift');
const zExpected = db.financials().expectedDrawer;
const z = db.zReport(zExpected - 25);
check('difference = -25 (عجز)', z.difference === -25);
check('net profit = total - expenses - commissions', z.netProfit === z.salesTotal - z.expensesTotal - z.commissions);
check('net profit exact', z.netProfit === (EXPECT_TOTAL + 250) - (680 + 100) - Math.round((EXPECT_TOTAL + 250) * 0.2));

console.log('P3-7 booking checkout: atomic done + price from DB + loyalty');
const booking = db.createBooking({ name: 'محمد طارق الشريف', phone: '01012345678', service: 'قص شعر استايل وفيد + سشوار', barber: 'الأسطى أحمد خليل', time: '06:00 م', price: 999, payment: 'كاش' });
// UI passes the catalog service; main must bill the catalog price (120), not the passed-in anything.
const rb = db.checkout({ items: [{ id: 'srv_1', title: 'قص شعر استايل وفيد + سشوار', qty: 1 }], payMethod: 'cash', barber: 'الأسطى أحمد خليل', customer: booking.name, bookingId: booking.id });
check('booking sale billed catalog price 120', rb.total === 120);
const apptRow = db.prepare('SELECT status s FROM appointments WHERE id=?').get(booking.id)!;
check('appointment marked done', apptRow.s === 'done');
const custRow = db.prepare('SELECT points p FROM customers WHERE phone=?').get('01012345678')!;
check('loyalty points bumped 280 + 12 = 292', Number(custRow.p) === 292);
// Custom booked service (not in catalog) bills the booked price.
const booking2 = db.createBooking({ name: 'زبون خدمة خاصة', phone: '01999999999', service: 'خدمة غير مدرجة', barber: 'كابتن روبي', time: '07:00 م', price: 90, payment: 'كاش' });
const rb2 = db.checkout({ items: [{ id: `booking:${booking2.id}`, title: 'خدمة غير مدرجة', qty: 1 }], payMethod: 'cash', barber: 'كابتن روبي', customer: booking2.name, bookingId: booking2.id });
check('custom booking billed booked price 90', rb2.total === 90);
check('unknown item without booking match throws', throws(() => db.checkout({ items: [{ id: 'nope', title: 'وهمي', qty: 1 }], payMethod: 'cash', barber: 'أ', customer: 'ز' })));

console.log('P3-8 price edits flow into checkout (live price source)');
db.saveService({ id: 'srv_2', title: 'تظبيط وتحديد دقن بالموس والخيط', cat: 'beard', price: 90, duration: '20 دقيقة' });
check('negative price rejected', throws(() => db.saveService({ title: 'غلط', cat: 'hair', price: -5, duration: '-' })));
const r12 = db.checkout({ items: [{ id: 'srv_2', title: 'تظبيط دقن', qty: 1 }], payMethod: 'cash', barber: 'أنور', customer: 'زبون جديد' });
check('checkout uses updated price 90', r12.total === 90);

console.log('P3-9 salon + templates + offers validation & persistence');
check('bad salon phone rejected', throws(() => db.saveSalon({ phone: '12345' })));
db.saveSalon({ phone: '01000000000', nameAr: 'صالون روبي باربر المطور' });
const salon = db.getSalon();
check('salon phone saved', salon.phone === '01000000000');
check('salon name saved', salon.nameAr === 'صالون روبي باربر المطور');
const tpl = db.saveTemplates([{ id: 'tpl_ticket', bodyAr: 'أهلاً {name} في {salon}' }]);
check('template body saved', tpl.find((t) => t.id === 'tpl_ticket')?.bodyAr === 'أهلاً {name} في {salon}');
check('empty template rejected', throws(() => db.saveTemplates([{ id: 'tpl_ticket', bodyAr: '   ' }])));
const off = db.saveOffer({ title: 'عرض الصيف', descAr: 'خصم لحية', price: 50, active: 1 });
check('offer added + active list', db.listOffers(true).some((o) => o.id === off.id));
db.deleteOffer(off.id);
check('offer deleted', !db.listOffers().some((o) => o.id === off.id));

console.log(`\nResult: ${pass} passed, ${fail} failed`);
try { db.close(); } catch { /* already closed */ }
try { fs.rmSync(file, { force: true }); } catch { /* temp file, safe to ignore */ }
process.exit(fail === 0 ? 0 : 1);
