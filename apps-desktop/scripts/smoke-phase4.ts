// Phase 4 smoke test — staff CRUD, payroll math against real sales/advances, append-only payments,
// inventory CRUD + restock + critical-stock levels. Runs on a throwaway DB seeded like a fresh install.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../src-main/db/clientTest';

const file = path.join(os.tmpdir(), `roby-smoke4-${Date.now()}.db`);
fs.rmSync(file, { recursive: true, force: true });

const db = build(file);
let pass = 0, fail = 0;
const check = (label: string, cond: boolean) => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); } else { fail++; console.log(`  FAIL  ${label}`); }
};
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
const mk = db.monthKey(new Date().toISOString());

console.log('P4-1 pure payroll math (net = salary + round(revenue×comm%) + tips − advances)');
const staffS = [{ id: 's1', nameAr: 'أ', role: 'باربر', commPct: 20, salary: 10000, photoPath: null }];
const pure = db.computePayroll(staffS, [{ barber: 'أ', revenue: 5000, tips: 100, count: 4 }], [{ id: 'ADV-1', staffId: 's1', amount: 200, note: '', at: '2026-10-05T00:00:00.000Z' }], [], '2026-10');
check('net = 10000 + 1000 + 100 − 200 = 10900', pure.items[0].net === 10900);
const pure2 = db.computePayroll(staffS, [{ barber: 'أ', revenue: 1001, tips: 0, count: 1 }], [], [], '2026-10');
check('commission rounding: round(1001×25/100) with commPct 20 → 200', pure2.items[0].commission === 200);
const staffS25 = [{ ...staffS[0], commPct: 25 }];
const pure3 = db.computePayroll(staffS25, [{ barber: 'أ', revenue: 1001, tips: 0, count: 1 }], [], [], '2026-10');
check('round(1001×25%) = round(250.25) = 250', pure3.items[0].commission === 250);
const pureNeg = db.computePayroll(staffS, [{ barber: 'أ', revenue: 0, tips: 0, count: 0 }], [{ id: 'ADV-2', staffId: 's1', amount: 20000, note: '', at: '2026-10-05T00:00:00.000Z' }], [], '2026-10');
check('net can go negative (advance > dues): −10000', pureNeg.items[0].net === -10000);
check('aggregateSales ignores other months', db.aggregateSales([
  { barber: 'أ', subtotal: 100, discount: 0, tip: 0, at: '2026-10-01T10:00:00.000Z' },
  { barber: 'أ', subtotal: 500, discount: 0, tip: 0, at: '2026-09-30T10:00:00.000Z' },
], '2026-10').reduce((s, a) => s + a.revenue, 0) === 100);
check('aggregateSales excludes discount from revenue', db.aggregateSales([
  { barber: 'أ', subtotal: 200, discount: 50, tip: 20, at: '2026-10-01T10:00:00.000Z' },
], '2026-10')[0].revenue === 150);

console.log('P4-2 staff CRUD (roster + validation + soft delete)');
check('seeded roster = 5 barbers', db.staffRoster().length === 5);
const newBarber = db.saveStaff({ nameAr: 'الأسطى كريم الجديد', role: 'كوافير', commPct: 30, salary: 4000 });
check('new barber added (roster 6)', db.staffRoster().length === 6);
check('new barber defaults to null photo', newBarber.photoPath === null);
check('empty name rejected', throws(() => db.saveStaff({ nameAr: '   ', role: 'x', commPct: 10, salary: 0 })));
check('commPct 150 rejected', throws(() => db.saveStaff({ nameAr: 'ب', role: 'x', commPct: 150, salary: 0 })));
check('negative salary rejected', throws(() => db.saveStaff({ nameAr: 'ب', role: 'x', commPct: 10, salary: -1 })));
db.saveStaff({ id: newBarber.id, nameAr: 'الأسطى كريم الجديد', role: 'ماستر باربر', commPct: 30, salary: 4500 });
check('edit persists (salary 4500)', db.staffRoster().find((s) => s.id === newBarber.id)?.salary === 4500);
db.deleteStaff(newBarber.id);
check('soft delete removes from roster', db.staffRoster().length === 5);
check('deleted barber gone from payroll too', !db.payroll(mk).items.some((i) => i.staffId === newBarber.id));
check('deleting twice rejected', throws(() => db.deleteStaff(newBarber.id)));

console.log('P4-3 payroll reads per-barber revenue + tips from real sales');
db.checkout({ items: [{ id: 'srv_3', title: 'كومبو', qty: 1 }], payMethod: 'cash', barber: 'الأسطى أحمد خليل', customer: 'زبون أ' });
db.checkout({ items: [{ id: 'srv_1', title: 'قص', qty: 1 }], tip: 30, payMethod: 'cash', barber: 'الأسطى أحمد خليل', customer: 'زبون ب' });
db.checkout({ items: [{ id: 'srv_2', title: 'دقن', qty: 1 }], payMethod: 'cash', barber: 'الأسطى أنور عسران', customer: 'زبون ج' });
const pay = db.payroll(mk);
const ahmed = pay.items.find((i) => i.nameAr === 'الأسطى أحمد خليل')!;
const anwar = pay.items.find((i) => i.nameAr === 'الأسطى أنور عسران')!;
check('ahmed revenue = 170 + 120 = 290 (tips excluded)', ahmed.revenue === 290);
check('ahmed tips = 30', ahmed.tips === 30);
check('ahmed count = 2', ahmed.count === 2);
check('ahmed commission = round(290×20%) = 58', ahmed.commission === 58);
check('ahmed advances = seeded 200', ahmed.advancesTotal === 200);
check('ahmed net = 5000 + 58 + 30 − 200 = 4888', ahmed.net === 4888);
check('anwar revenue = 70', anwar.revenue === 70);
check('anwar commission = 14', anwar.commission === 14);
check('anwar net = 5014', anwar.net === 5014);
check('totals revenue = 360', pay.totals.revenue === 360);
check('untouched barber keeps full salary net', pay.items.find((i) => i.nameAr === 'كابتن روبي باربر')?.net === 8000);
// Month isolation via a raw historical sale (checkout always writes "now").
db.prepare("INSERT INTO sales (id, receipt_no, items_json, subtotal, discount, tip, total, pay_method, ref, barber, customer, at) VALUES ('old1','RB-9001','[]',999,0,0,999,'cash',NULL,'الأسطى أحمد خليل','قديم','2026-01-15T10:00:00.000Z')").run();
check('old-month sale not in current payroll', db.payroll(mk).items.find((i) => i.nameAr === 'الأسطى أحمد خليل')!.revenue === 290);
check('old-month sale counted in its own month', db.payroll('2026-01').items.find((i) => i.nameAr === 'الأسطى أحمد خليل')!.revenue === 999);

console.log('P4-4 advances + finalize payment (append-only, double-pay guarded)');
const adv2 = db.addAdvance('ahmed', 100, 'سلفة إضافية');
check('advance numbering continues (ADV-102)', adv2.id === 'ADV-102');
check('amount 0 rejected', throws(() => db.addAdvance('ahmed', 0, '')));
check('advance for unknown staff rejected', throws(() => db.addAdvance('ghost', 50, '')));
let ahmedNow = db.payroll(mk).items.find((i) => i.nameAr === 'الأسطى أحمد خليل')!;
check('advances total 300 after second advance', ahmedNow.advancesTotal === 300);
check('net drops to 4788', ahmedNow.net === 4788);
check('advancesList shows the month rows', ahmedNow.advancesList.length === 2);
db.deleteAdvance(adv2.id);
check('mistaken advance deleted → back to 200', db.payroll(mk).items.find((i) => i.nameAr === 'الأسطى أحمد خليل')!.advancesTotal === 200);
const paid = db.payStaff('anwar', mk);
check('pay uses computed net 5014 (never a UI amount)', paid.amount === 5014);
check('double pay rejected', throws(() => db.payStaff('anwar', mk)));
check('paid flag visible on next read', db.payroll(mk).items.find((i) => i.nameAr === 'الأسطى أنور عسران')?.paid?.amount === 5014);
check('payment does not change net formula', db.payroll(mk).items.find((i) => i.nameAr === 'الأسطى أنور عسران')!.net === 5014);
const advPaid = db.addAdvance('anwar', 10, 'سلفة بعد الصرف');
check('advance deletion blocked for a paid month', throws(() => db.deleteAdvance(advPaid.id)));
const debtBarber = db.saveStaff({ nameAr: 'الأسطى اختبار السلفة', role: 'كوافير', commPct: 0, salary: 0 });
db.addAdvance(debtBarber.id, 50, 'سلفة');
check('non-positive net payout rejected', throws(() => db.payStaff(debtBarber.id, mk)));
const advDebt = db.payroll(mk).items.find((i) => i.staffId === debtBarber.id)!.advancesList[0];
db.deleteAdvance(advDebt.id);
check('net = 0 payout still rejected', throws(() => db.payStaff(debtBarber.id, mk)));
db.deleteStaff(debtBarber.id);

console.log('P4-5 inventory CRUD + restock + critical levels');
const seedLevels = db.inventory().levels;
check('7 seeded items', seedLevels.count === 7);
check('3 critical at seed (qty ≤ min)', seedLevels.criticalCount === 3);
check('cost value = 5460', seedLevels.costValue === 5460);
check('retail shelf value = 5880', seedLevels.retailValue === 5880);
check('salon/retail split 5/2', seedLevels.salonCount === 5 && seedLevels.retailCount === 2);
const pureLevels = db.stockLevels([
  { id: 'a', name: 'a', type: 'salon', cost: 10, price: 0, qty: 5, minQty: 5 },
  { id: 'b', name: 'b', type: 'retail', cost: 20, price: 40, qty: 6, minQty: 5 },
]);
check('pure: qty == min is critical', pureLevels.criticalCount === 1);
check('pure: values computed (cost 170, retail 240)', pureLevels.costValue === 170 && pureLevels.retailValue === 240);
check('isCritical helper (qty 4 ≤ 5)', db.isCritical(4, 5) === true);
const restocked = db.restock('inv_2', 10);
check('restock inv_2: 3 + 10 = 13', restocked.qty === 13);
check('critical count drops to 2 after restock', db.inventory().levels.criticalCount === 2);
check('restock qty 0 rejected', throws(() => db.restock('inv_2', 0)));
check('restock unknown item rejected', throws(() => db.restock('ghost', 5)));
const newItem = db.saveStock({ name: 'جيل حلاقة جديد', type: 'retail', cost: 50, price: 100, qty: 20, minQty: 5 });
check('new item added (8 items)', db.inventory().levels.count === 8);
check('negative qty rejected', throws(() => db.saveStock({ name: 'غلط', type: 'salon', cost: 1, price: 0, qty: -1, minQty: 0 })));
check('empty name rejected', throws(() => db.saveStock({ name: '', type: 'salon', cost: 1, price: 0, qty: 1, minQty: 0 })));
db.saveStock({ id: newItem.id, name: 'جيل حلاقة جديد', type: 'retail', cost: 50, price: 120, qty: 20, minQty: 5 });
check('edit persists price 120', db.inventory().items.find((i) => i.id === newItem.id)?.price === 120);
db.deleteStock(newItem.id);
check('soft delete removes item (7 items)', db.inventory().levels.count === 7);
check('deleted item gone from items list', !db.inventory().items.some((i) => i.id === newItem.id));
check('overview criticalStock matches levels after all changes', db.overview().criticalStock === db.inventory().levels.criticalCount);

console.log(`\nResult: ${pass} passed, ${fail} failed`);
try { db.close(); } catch { /* already closed */ }
try { fs.rmSync(file, { force: true }); } catch { /* temp file, safe to ignore */ }
process.exit(fail === 0 ? 0 : 1);
