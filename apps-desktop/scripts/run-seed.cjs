// Seed check via Electron-ABI runtime (matches the app's binary).
// Run: npx electron scripts/run-seed.cjs
require('tsx/cjs');
require('../src-main/db/seed.ts');
