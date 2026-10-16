// License state machine (Phase 5): fresh PC → 7-day trial → lock; owner key → lifetime on THIS machine.
// Rules locked in PROJECT_PLAN §7/§8:
//  - key is MID-bound, verified offline with the embedded owner public key;
//  - stored via Electron safeStorage when available (tests use an encoded fallback);
//  - clock rollback (last_seen in the future) marks the install tampered → locked;
//  - a restored backup carries another machine's row → locked until a key for THIS MID is entered;
//  - offline reality: the only "revoke" is a local blocklist shipped in updates (documented limit).
import { eq } from 'drizzle-orm';
import { licenses, type BetterSQLiteDatabase } from '../../db/schema';
import { machineId } from './machineId';
import { reasonAr, verifyLicenseKey } from './key';
import { log } from '../../logger';

export const TRIAL_DAYS = 7;
export const ROLLBACK_TOLERANCE_MS = 2 * 60 * 60 * 1000; // 2h — DST/manual clock drift tolerance
/** Disputed MIDs — ship in an app update to lock a machine out (offline revoke limit, documented). */
export const BLOCKED_MIDS: string[] = [];
/** Where the barber sends his MID to get a key (change before handover if needed). */
export const OWNER_WHATSAPP = '201000000000';

export type LicenseStatus = 'trial' | 'active' | 'locked' | 'expired';
export type LockReason = 'trial-expired' | 'clock-rollback' | 'transferred' | 'key-invalid' | 'blocked' | null;

export interface LicenseState {
  status: LicenseStatus;
  mid: string;
  daysLeft: number | null;
  activatedAt: string | null;
  reason: LockReason;
  ownerWhatsApp: string;
}

// ---- key storage: safeStorage in the app, plain base64 fallback (tests / headless runs) ----
function encryptKey(plain: string): string {
  try {
    // Lazy import: electron is unavailable when smoke tests run via ELECTRON_RUN_AS_NODE.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { safeStorage } = require('electron') as typeof import('electron');
    if (safeStorage?.isEncryptionAvailable()) {
      return `enc:${safeStorage.encryptString(plain).toString('base64')}`;
    }
  } catch { /* fall through */ }
  return `plain:${Buffer.from(plain, 'utf8').toString('base64')}`;
}

function decryptKey(stored: string): string | null {
  try {
    if (stored.startsWith('plain:')) return Buffer.from(stored.slice(6), 'base64').toString('utf8');
    if (stored.startsWith('enc:')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { safeStorage } = require('electron') as typeof import('electron');
      if (!safeStorage?.isEncryptionAvailable()) return null;
      return safeStorage.decryptString(Buffer.from(stored.slice(4), 'base64'));
    }
  } catch { /* corrupted / other machine */ }
  return null;
}

function rowFor(db: BetterSQLiteDatabase, mid: string) {
  return db.select().from(licenses).where(eq(licenses.machineId, mid)).get();
}

export function licenseState(db: BetterSQLiteDatabase, publicKeyPem: string, mid = machineId()): LicenseState {
  const now = Date.now();
  const rows = db.select().from(licenses).all();
  let row = rows.find((r) => r.machineId === mid);

  if (!row) {
    if (rows.length > 0) {
      // DB came from another PC (restored backup) — never auto-trial, require this MID's key.
      return { status: 'locked', mid, daysLeft: null, activatedAt: null, reason: 'transferred', ownerWhatsApp: OWNER_WHATSAPP };
    }
    const iso = new Date(now).toISOString();
    db.insert(licenses).values({ machineId: mid, key: '', activatedAt: null, trialStartedAt: iso, lastSeen: iso }).run();
    row = rowFor(db, mid)!;
    log.info('license: fresh trial started', mid);
  }

  // Clock rollback → tampered (sticky).
  if (row.tamperedAt) {
    return { status: 'locked', mid, daysLeft: null, activatedAt: row.activatedAt, reason: 'clock-rollback', ownerWhatsApp: OWNER_WHATSAPP };
  }
  if (now + ROLLBACK_TOLERANCE_MS < Date.parse(row.lastSeen)) {
    db.update(licenses).set({ tamperedAt: new Date(now).toISOString() }).where(eq(licenses.machineId, mid)).run();
    log.warn('license: clock rollback detected', { lastSeen: row.lastSeen });
    return { status: 'locked', mid, daysLeft: null, activatedAt: row.activatedAt, reason: 'clock-rollback', ownerWhatsApp: OWNER_WHATSAPP };
  }

  // Activated → re-verify the stored key every launch/24h.
  if (row.activatedAt && row.key) {
    const plain = decryptKey(row.key);
    const result = plain ? verifyLicenseKey(plain, mid, publicKeyPem, { blockedMids: BLOCKED_MIDS }) : null;
    if (result?.ok) {
      if (now > Date.parse(row.lastSeen)) {
        db.update(licenses).set({ lastSeen: new Date(now).toISOString() }).where(eq(licenses.machineId, mid)).run();
      }
      return { status: 'active', mid, daysLeft: null, activatedAt: row.activatedAt, reason: null, ownerWhatsApp: OWNER_WHATSAPP };
    }
    const reason: LockReason = result && !result.ok && result.reason === 'blocked' ? 'blocked' : 'key-invalid';
    log.warn('license: stored key failed re-verification', reason);
    return { status: 'locked', mid, daysLeft: null, activatedAt: row.activatedAt, reason, ownerWhatsApp: OWNER_WHATSAPP };
  }

  // Trial countdown.
  const started = Date.parse(row.trialStartedAt) || now;
  const daysLeft = TRIAL_DAYS - Math.floor((now - started) / (24 * 60 * 60 * 1000));
  if (now > Date.parse(row.lastSeen)) {
    db.update(licenses).set({ lastSeen: new Date(now).toISOString() }).where(eq(licenses.machineId, mid)).run();
  }
  if (daysLeft <= 0) {
    return { status: 'expired', mid, daysLeft: 0, activatedAt: null, reason: 'trial-expired', ownerWhatsApp: OWNER_WHATSAPP };
  }
  return { status: 'trial', mid, daysLeft, activatedAt: null, reason: null, ownerWhatsApp: OWNER_WHATSAPP };
}

/** Activate with an owner-issued key. Allowed during trial, after expiry, or on a transferred DB. */
export function activateLicense(db: BetterSQLiteDatabase, key: string, publicKeyPem: string, mid = machineId()): LicenseState {
  const result = verifyLicenseKey(key.trim(), mid, publicKeyPem, { blockedMids: BLOCKED_MIDS });
  if (!result.ok) throw new Error(reasonAr(result.reason));
  const nowIso = new Date().toISOString();
  const existing = rowFor(db, mid);
  if (existing) {
    // A valid owner key is an explicit human override: it also clears a sticky clock-rollback flag.
    db.update(licenses).set({ key: encryptKey(key.trim()), activatedAt: nowIso, lastSeen: nowIso, tamperedAt: null }).where(eq(licenses.machineId, mid)).run();
  } else {
    db.insert(licenses).values({ machineId: mid, key: encryptKey(key.trim()), activatedAt: nowIso, trialStartedAt: nowIso, lastSeen: nowIso }).run();
  }
  log.info('license: activated lifetime', mid);
  return licenseState(db, publicKeyPem, mid);
}
