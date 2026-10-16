// Test runner (Electron-ABI runtime): runs each smoke phase as its own Node-mode Electron process.
// Run: npx electron scripts/run-tests.cjs
// Why: better-sqlite3 is built for Electron's ABI so the packaged app never breaks;
// running tests through the Electron binary's Node runtime keeps ONE ABI everywhere locally.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const files = ['smoke-phase2.ts', 'smoke-phase3.ts', 'smoke-phase4.ts'];
let failed = false;
for (const f of files) {
  const r = spawnSync(process.execPath, ['-r', 'tsx/cjs', path.join(__dirname, f)], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  });
  if (r.status !== 0) { failed = true; console.log(`>>> ${f} FAILED (exit ${r.status})`); }
}
process.exit(failed ? 1 : 0);
