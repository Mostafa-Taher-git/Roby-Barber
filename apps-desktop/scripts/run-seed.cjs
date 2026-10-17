// Seed check via Electron-ABI runtime (matches the app's binary).
// Run: npx electron scripts/run-seed.cjs
require('tsx/cjs');
require('../src-main/db/seed.ts');
// seed.ts is fully synchronous; Electron keeps the main process alive after the
// script finishes, so exit explicitly (required on CI, harmless locally).
process.exit(0);
