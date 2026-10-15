// Inspect the real app DB via Electron-ABI runtime (read-only).
// Run: npx electron -r tsx/cjs scripts/inspect-db.cjs [path]
require('tsx/cjs');
require('./inspect-db.ts');
