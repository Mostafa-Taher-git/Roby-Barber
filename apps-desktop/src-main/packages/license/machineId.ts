// Stable Machine ID (MID) — Windows MachineGuid + hostname hashed. Survives reboots/updates,
// changes only on OS reinstall (customer then needs a new key — documented limitation).
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import os from 'node:os';

let cached: string | null = null;

function machineGuid(): string {
  try {
    const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000,
    });
    const m = /MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/.exec(out);
    if (m) return m[1].toLowerCase();
  } catch { /* registry unavailable — fall back below */ }
  return 'no-guid';
}

/** e.g. MID-3F7A-9C21 — deterministic per machine. */
export function machineId(): string {
  if (cached) return cached;
  const seed = `${machineGuid()}|${os.hostname().toLowerCase()}|roby-barber`;
  const hex = crypto.createHash('sha256').update(seed, 'utf8').digest('hex').toUpperCase();
  cached = `MID-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
  return cached;
}
