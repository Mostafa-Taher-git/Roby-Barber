// Phase 5 smoke test — offline license system: pure key crypto (ephemeral test keypair), MID format,
// trial countdown, activation, re-verification, tamper/rollback/transfer locks. Real SQLite, no GUI.
// NOTE: the test keypair below exists ONLY in this test — production keys use tools/license-gen + publicKey.ts.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../src-main/db/clientTest';

const mkFile = (n: string) => {
  const f = path.join(os.tmpdir(), `roby-smoke5-${n}-${Date.now()}.db`);
  fs.rmSync(f, { recursive: true, force: true });
  return f;
};

const main = build(mkFile('main'));
const other = build(mkFile('other'));
let pass = 0, fail = 0;
const check = (label: string, cond: boolean) => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); } else { fail++; console.log(`  FAIL  ${label}`); }
};
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
const throwMsg = (fn: () => unknown): string => { try { fn(); return ''; } catch (e) { return (e as Error).message; } };

// Test-only keypair (never ships; production private key lives outside the repo).
const { publicKey: testPub, privateKey: testPriv } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const { publicKey: otherPub } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const MID = 'MID-1234-ABCD';
const OTHER_MID = 'MID-9999-FFFF';
const sign = (payload: ReturnType<typeof main.buildPayload>, priv = testPriv) =>
  crypto.sign('sha256', main.payloadBytes(payload), priv);
const keyFor = (mid: string) => {
  const payload = main.buildPayload(mid);
  return main.encodeLicenseKey(payload, sign(payload));
};
const iso = (offsetDays: number, offsetHours = 0) =>
  new Date(Date.now() + offsetDays * 86400000 + offsetHours * 3600000).toISOString();

console.log('P5-1 MID format + stability');
const mid = main.machineId();
check('machineId matches MID-XXXX-XXXX', /^MID-[0-9A-F]{4}-[0-9A-F]{4}$/.test(mid));
check('machineId stable across calls', main.machineId() === mid);

console.log('P5-2 pure key encode/decode/verify (ephemeral test keypair)');
const goodKey = keyFor(MID);
const decoded = main.decodeLicenseKey(goodKey);
check('decode round-trips payload', decoded?.payload.mid === MID && decoded?.payload.kind === 'lifetime' && decoded?.payload.v === 1);
check('verify happy path', main.verifyLicenseKey(goodKey, MID, testPub).ok === true);
check('key survives trim + newlines', main.verifyLicenseKey(`  ${goodKey}\n`, MID, testPub).ok === true);
const wrongMid = main.verifyLicenseKey(goodKey, OTHER_MID, testPub);
check('other machine rejected (mid_mismatch)', !wrongMid.ok && wrongMid.reason === 'mid_mismatch');
const wrongKey = main.verifyLicenseKey(goodKey, MID, otherPub);
check('other owner keypair rejected (bad_signature)', !wrongKey.ok && wrongKey.reason === 'bad_signature');
const blocked = main.verifyLicenseKey(goodKey, MID, testPub, { blockedMids: [MID] });
check('blocklisted MID rejected', !blocked.ok && blocked.reason === 'blocked');
const tamperedPayload = Buffer.from(JSON.stringify({ ...main.buildPayload(MID), issued: '2020-01-01T00:00:00.000Z' }), 'utf8').toString('base64url');
const tamperedKey = `RB1-${tamperedPayload}.${goodKey.split('.')[1]}`;
const tampered = main.verifyLicenseKey(tamperedKey, MID, testPub);
check('signature reused on altered payload rejected (bad_signature)', !tampered.ok && tampered.reason === 'bad_signature');
for (const bad of ['', '   ', 'RB1-', 'RB1-abc', 'RB1-abc.', 'RB1-.x', 'RB1-%%%%.%%%%', 'RB2-' + goodKey.slice(4), 'hello world']) {
  check(`malformed rejected: "${bad.slice(0, 14)}"`, main.verifyLicenseKey(bad, MID, testPub).reason === 'malformed');
}
check('flipping one payload char breaks signature', main.verifyLicenseKey(goodKey.slice(0, 10) + (goodKey[10] === 'A' ? 'B' : 'A') + goodKey.slice(11), MID, testPub).ok === false);
check('reasonAr explains every failure in Arabic', ['malformed', 'mid_mismatch', 'bad_signature', 'blocked'].every((r) => (main.reasonAr as (x: string) => string)(r).length > 5));

console.log('P5-3 fresh install → 7-day trial');
const s0 = main.licenseState(testPub, MID);
check('fresh PC starts trial', s0.status === 'trial');
check('trial = 7 days left', s0.daysLeft === main.trialDays);
check('trial exposes MID + owner WhatsApp', s0.mid === MID && s0.ownerWhatsApp.length > 6);
check('trial row persisted with last_seen', !!main.licenseRow(MID));

console.log('P5-4 countdown + expiry');
main.setLicenseRow(MID, { trialStartedAt: iso(-3), lastSeen: iso(-3) });
const s3 = main.licenseState(testPub, MID);
check('day 3 → 4 days left', s3.status === 'trial' && s3.daysLeft === 4);
main.setLicenseRow(MID, { trialStartedAt: iso(-8), lastSeen: iso(-8) });
const expired = main.licenseState(testPub, MID);
check('day 8 → expired (trial-expired)', expired.status === 'expired' && expired.reason === 'trial-expired');

console.log('P5-5 activation (after expiry) + persistence + re-verification');
const actMsgWrong = throwMsg(() => main.activate(keyFor(OTHER_MID), testPub, MID));
check('key for another MID rejected with Arabic reason', actMsgWrong.includes('جهاز آخر'));
const actMsgBad = throwMsg(() => main.activate('RB1-not-a-key', testPub, MID));
check('garbage key rejected with Arabic reason', actMsgBad.includes('صيغة المفتاح'));
const active = main.activate(goodKey, testPub, MID);
check('valid key → active (activation allowed after trial expiry)', active.status === 'active' && active.activatedAt !== null);
const rowAfterAct = main.licenseRow(MID) as { key: string };
check('stored key is not raw plaintext at rest', !rowAfterAct.key.includes(goodKey) && /^(enc|plain):/.test(rowAfterAct.key));
check('re-verify on next launch → still active', main.licenseState(testPub, MID).status === 'active');
check('re-activation idempotent', main.activate(goodKey, testPub, MID).status === 'active');

console.log('P5-6 tampered stored key → locked until re-activated');
const goodStored = (main.licenseRow(MID) as { key: string }).key;
main.setLicenseRow(MID, { key: `plain:${Buffer.from('RB1-AAAA.BBBB').toString('base64')}` });
const lockedKey = main.licenseState(testPub, MID);
check('corrupted stored key → locked (key-invalid)', lockedKey.status === 'locked' && lockedKey.reason === 'key-invalid');
main.setLicenseRow(MID, { key: goodStored });
check('restored key → active again', main.licenseState(testPub, MID).status === 'active');

console.log('P5-7 clock rollback → sticky tamper lock');
main.setLicenseRow(MID, { lastSeen: iso(0, 3) });
const rollback = main.licenseState(testPub, MID);
check('last_seen in the future → locked (clock-rollback)', rollback.status === 'locked' && rollback.reason === 'clock-rollback');
check('tamper flag persisted', !!(main.licenseRow(MID) as { tampered_at: string | null }).tampered_at);
main.setLicenseRow(MID, { lastSeen: iso(0) });
check('rollback lock is sticky even with fixed clock', main.licenseState(testPub, MID).status === 'locked');
main.activate(goodKey, testPub, MID);
check('valid owner key clears the sticky rollback lock', main.licenseState(testPub, MID).status === 'active');

console.log('P5-8 backup restore on another PC → transferred lock');
const first = other.licenseState(testPub, OTHER_MID);
check('other DB starts its own trial for its MID', first.status === 'trial');
const transferredState = other.licenseState(testPub, MID);
check('DB with foreign row → locked (transferred), no free trial', transferredState.status === 'locked' && transferredState.reason === 'transferred');
const unlocked = other.activate(keyFor(MID), testPub, MID);
check('own key unlocks a transferred DB', unlocked.status === 'active');
check('original machine row untouched', other.licenseState(testPub, OTHER_MID).status === 'trial');

console.log(`\nPhase 5 smoke: ${pass} passed, ${fail} failed`);
main.close();
other.close();
process.exit(fail === 0 ? 0 : 1);
