// CLI seed check — verifies the customer's one-time data migration lands correctly.
// Auto-seed also runs on first launch (see db/client.ts), so this is a verification tool, not the loader.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app } from 'electron';
import { SEED_ROWS, applySeed, isFreshDb } from './seedRows';

const target = process.env.ROBY_DB
  ?? (process.versions.electron ? path.join(app.getPath('userData'), 'roby.db') : path.join(os.tmpdir(), 'roby-seed-check.db'));

fs.mkdirSync(path.dirname(target), { recursive: true });
const sqlite = new Database(target);
sqlite.pragma('journal_mode = WAL');

// Create tables directly (avoids importing drizzle client which pulls in electron).
import { TABLES } from './tables';
for (const sql of TABLES) sqlite.exec(sql);

if (isFreshDb(sqlite)) {
  console.log(`fresh DB detected (${target}) — seeding…`);
  applySeed(sqlite);
} else {
  console.log('DB already seeded — verifying only');
}

const counts = Object.fromEntries(
  SEED_ROWS.map(({ table }) => {
    const row = sqlite.prepare(`SELECT COUNT(*) c FROM ${table}`).get() as { c: number };
    return [table, row.c];
  }),
);
console.log(JSON.stringify(counts));
sqlite.close();
