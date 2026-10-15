import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Logging must work inside Electron (userData/logs) AND outside it (CLI/seed/tests → ROBY_LOG_DIR or temp).
let cachedDir: string | null = null;

function logDir() {
  if (cachedDir) return cachedDir;
  const override = process.env.ROBY_LOG_DIR;
  const base = override
    ? override
    : process.versions.electron
      ? path.join(getUserData(), 'logs')
      : path.join(os.tmpdir(), 'roby-logs');
  cachedDir = base;
  fs.mkdirSync(cachedDir, { recursive: true });
  return cachedDir;
}

// Imported lazily to avoid requiring Electron when running plain Node (tests, seed).
function getUserData() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { app } = require('electron') as typeof import('electron');
  return app.getPath('userData');
}

function writeLine(level: string, args: unknown[]) {
  const line = `[${new Date().toISOString()}] [${level}] ${args
    .map((a) => (a instanceof Error ? a.stack ?? a.message : JSON.stringify(a)))
    .join(' ')}\n`;
  try {
    fs.appendFileSync(path.join(logDir(), 'app.log'), line);
  } catch {
    // never let logging crash the app
  }
}

export const log = {
  info: (...args: unknown[]) => writeLine('INFO', args),
  error: (...args: unknown[]) => writeLine('ERROR', args),
};
