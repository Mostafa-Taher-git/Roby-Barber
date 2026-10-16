#!/usr/bin/env node
// OWNER-ONLY keypair generator for Roby Barber licenses. Run ONCE, offline.
//   node tools/license-generator/keygen.cjs [keys-dir]
// Default keys-dir: %USERPROFILE%\RobyBarber-License-Keys  (OUTSIDE the repo, on purpose)
// private.pem NEVER leaves your machine and is NEVER committed. Back it up somewhere safe —
// without it you cannot issue license keys ever again.
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = process.argv[2] || path.join(os.homedir(), 'RobyBarber-License-Keys');
const privPath = path.join(dir, 'private.pem');

if (fs.existsSync(privPath)) {
  console.error(`REFUSING: ${privPath} already exists. Delete it manually if you really want to rotate keys (all issued keys would stop working).`);
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(privPath, privateKey, { mode: 0o600 });
fs.writeFileSync(path.join(dir, 'public.pem'), publicKey);

console.log('Keypair created (RSA-2048).');
console.log('  private: ' + privPath + '  <-- SECRET, back it up, never share/commit');
console.log('  public:  ' + path.join(dir, 'public.pem'));
console.log('');
console.log('Paste the public key into apps-desktop/src-main/packages/license/publicKey.ts');
console.log('(the file must contain exactly the PEM below):');
console.log('');
console.log(publicKey);
