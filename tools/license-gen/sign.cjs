#!/usr/bin/env node
// OWNER-ONLY license key signer. Offline tool — run it on your own machine.
//   node tools/license-gen/sign.cjs --mid MID-XXXX-XXXX [--keys DIR] [--by "الاسم"]
// Prints the RB1-... lifetime key for that machine and appends it to issued_keys.csv.
// The payload format MUST stay identical to apps-desktop/src-main/packages/license/key.ts
// (field order v, mid, kind, issued is part of the signed bytes).
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const mid = getArg('--mid');
const dir = getArg('--keys') || path.join(os.homedir(), 'RobyBarber-License-Keys');
const by = getArg('--by') || 'owner';

if (!mid || !/^MID-[0-9A-F]{4}-[0-9A-F]{4}$/.test(mid)) {
  console.error('Usage: node sign.cjs --mid MID-XXXX-XXXX [--keys DIR] [--by name]');
  console.error('The MID is shown on the app lock screen (الصيغة MID-XXXX-XXXX).');
  process.exit(1);
}

const privPath = path.join(dir, 'private.pem');
if (!fs.existsSync(privPath)) {
  console.error(`Missing ${privPath} — run keygen.cjs first.`);
  process.exit(1);
}

const payload = { v: 1, mid, kind: 'lifetime', issued: new Date().toISOString() };
const bytes = Buffer.from(JSON.stringify(payload), 'utf8');
const signature = crypto.sign('sha256', bytes, fs.readFileSync(privPath, 'utf8'));
const key = `RB1-${bytes.toString('base64url')}.${signature.toString('base64url')}`;

const csv = path.join(dir, 'issued_keys.csv');
if (!fs.existsSync(csv)) fs.writeFileSync(csv, 'machine_id,key,issued_at,issued_by\n');
fs.appendFileSync(csv, `${mid},${key},${payload.issued},${by}\n`);

console.log(key);
console.error(`Signed for ${mid}. Logged to ${csv}`);
