// Phase 6 smoke test — WhatsApp connector: phone normalization, template fill, wa.me link,
// kind lookup from the editable DB templates, custom messages, validation + click log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../src-main/db/clientTest';

const file = path.join(os.tmpdir(), `roby-smoke6-${Date.now()}.db`);
fs.rmSync(file, { recursive: true, force: true });

const db = build(file);
let pass = 0, fail = 0;
const check = (label: string, cond: boolean) => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); } else { fail++; console.log(`  FAIL  ${label}`); }
};
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
const msgOf = (fn: () => unknown): string => { try { fn(); return ''; } catch (e) { return (e as Error).message; } };

console.log('P6-1 Egyptian phone normalization → wa.me international');
check('01012345678 → 201012345678', db.normalizePhone('01012345678') === '201012345678');
check('spaces/dashes stripped: 010 1234 5678', db.normalizePhone('010 1234 5678') === '201012345678');
check('+20 101 234 5678 → 201012345678', db.normalizePhone('+20 101 234 5678') === '201012345678');
check('00201012345678 → 201012345678', db.normalizePhone('00201012345678') === '201012345678');
check('10-digit without zero: 1012345678 → 201012345678', db.normalizePhone('1012345678') === '201012345678');
check('already international 201012345678 kept', db.normalizePhone('201012345678') === '201012345678');
check('garbage → null', db.normalizePhone('abc-12') === null);
check('empty → null', db.normalizePhone('') === null && db.normalizePhone('   ') === null);

console.log('P6-2 template placeholders');
check('fills known vars', db.fillTemplate('أهلاً {name} من {salon}!', { name: 'يوسف', salon: 'روبي' }) === 'أهلاً يوسف من روبي!');
check('numbers stringified', db.fillTemplate('الباقي {points} نقطة', { points: 150 }) === 'الباقي 150 نقطة');
check('unknown token left visible', db.fillTemplate('أهلاً {name} — {missing}', { name: 'أ' }) === 'أهلاً أ — {missing}');
check('repeated token filled everywhere', db.fillTemplate('{x}-{x}', { x: '9' }) === '9-9');
check('empty body stays empty', db.fillTemplate('', { x: '1' }) === '');
check('{null-ish} not treated as var', db.fillTemplate('{constructor}', {}) === '{constructor}');

console.log('P6-3 wa.me link building');
const link = db.waLink('201012345678', 'أهلاً {name}');
check('prefix + encoded text', link.startsWith('https://wa.me/201012345678?text='));
check('Arabic encoded (no raw spaces)', !link.includes(' ') && link.includes(encodeURIComponent('أهلاً')));
check('newlines encoded as %0A', db.waLink('201012345678', 'سطر١\nسطر٢').includes('%0A'));

console.log('P6-4 share from seeded editable templates');
const seeded = db.waShare({ kind: 'campaign', phone: '01012345678' });
check('campaign (no vars) resolves + salon name injected', seeded.text.includes('روبي باربر') && !seeded.text.includes('{salon}'));
check('label in Arabic', seeded.label === 'عرض ترويجي' && seeded.to === '201012345678');
const reminder = db.waShare({ kind: 'reminder', phone: '01012345678', vars: { name: 'يوسف حسن', points: 150 } });
check('reminder fills name + points', reminder.text.includes('يوسف حسن') && reminder.text.includes('150'));
check('reminder link uses normalized phone', reminder.url.startsWith('https://wa.me/201012345678?'));
const ticket = db.waShare({ kind: 'ticket', phone: '01012345678', vars: { name: 'عمر', time: '05:00 م' } });
check('ticket fills name + time', ticket.text.includes('عمر') && ticket.text.includes('05:00 م'));
const receipt = db.waShare({ kind: 'receipt', phone: '01012345678', vars: { receipt: 'RB-1001', total: '150' } });
check('receipt fills no + total', receipt.text.includes('RB-1001') && receipt.text.includes('150'));
check('template edit is picked up (DB-driven)', (() => {
  db.saveTemplates([{ id: 'tpl_campaign', bodyAr: 'عرض خاص من {salon} للشباب!' }]);
  const t = db.waShare({ kind: 'campaign', phone: '01012345678' }).text;
  return t.startsWith('عرض خاص من ') && t.endsWith(' للشباب!') && !t.includes('{salon}');
})());

console.log('P6-5 custom message + validation + click log');
const custom = db.waShare({ kind: 'custom', phone: '01012345678', text: 'رسالة مخصصة يا {name}', vars: { name: 'طارق' } });
check('custom text used + vars filled', custom.text === 'رسالة مخصصة يا طارق');
check('custom without text rejected (Arabic)', msgOf(() => db.waShare({ kind: 'custom', phone: '01012345678' })).includes('فاضية'));
check('bad phone rejected (Arabic)', msgOf(() => db.waShare({ kind: 'reminder', phone: 'x' })).includes('غير صالح'));
check('unknown kind rejected (Arabic)', msgOf(() => db.waShare({ kind: 'nope' as never, phone: '01012345678' })).includes('غير معروف'));
const before = db.prepare('SELECT COUNT(*) AS c FROM activity_log').get() as { c: number };
db.waShare({ kind: 'reminder', phone: '01012345678', vars: { name: 'يوسف حسن', points: 150 } });
const after = db.prepare('SELECT COUNT(*) AS c FROM activity_log').get() as { c: number };
check('click logged to activity feed', Number(after.c) === Number(before.c) + 1);
const lastLog = db.prepare('SELECT text FROM activity_log ORDER BY id DESC LIMIT 1').get() as { text: string };
check('log names the customer', lastLog.text.includes('يوسف حسن') && lastLog.text.includes('تذكير بزيارة'));
const phoneLog = db.waShare({ kind: 'campaign', phone: '01012345678' });
const lastLog2 = db.prepare('SELECT text FROM activity_log ORDER BY id DESC LIMIT 1').get() as { text: string };
check('log falls back to phone when no name', lastLog2.text.includes('201012345678'));

console.log('P6-6 overridden text beats template (receipt re-send)');
const override = db.waShare({ kind: 'receipt', phone: '01012345678', text: 'فاتورة {receipt} — {total} ج.م' , vars: { receipt: 'RB-9', total: 99 } });
check('explicit text wins over template', override.text === 'فاتورة RB-9 — 99 ج.م');

console.log(`\nPhase 6 smoke: ${pass} passed, ${fail} failed`);
db.close();
process.exit(fail === 0 ? 0 : 1);
