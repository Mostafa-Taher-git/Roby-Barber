import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

const line = (level: string, ...args: unknown[]) =>
  `[${new Date().toISOString()}] [${level}] ${args.map((a) => (a instanceof Error ? a.stack ?? a.message : JSON.stringify(a))).join(' ')}\n`;

function logFile() {
  const dir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'app.log');
}

export const log = {
  info: (...args: unknown[]) => fs.appendFileSync(logFile(), line('INFO', ...args)),
  error: (...args: unknown[]) => fs.appendFileSync(logFile(), line('ERROR', ...args)),
};
