// Electron-ABI test runner: registers tsx first, then loads the TS test file.
// Run: npx electron scripts/run-tests.cjs
// Why: better-sqlite3 is built for Electron's ABI so the packaged app never breaks;
// running tests through the Electron binary's Node runtime keeps ONE ABI everywhere locally.
require('tsx/cjs');
require('./smoke-phase2.ts');
