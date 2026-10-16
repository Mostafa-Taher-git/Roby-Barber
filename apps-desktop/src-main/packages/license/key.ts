// License key format (Phase 5) — pure encode/decode/verify, no DB.
// Key string:  RB1-<base64url(payloadJson)>.<base64url(rsaSha256Signature)>
// The payload JSON is the exact signed message; its field order is fixed when we build it.
import crypto from 'node:crypto';

export interface LicensePayload {
  v: 1;
  mid: string;          // machine id the key was issued for
  kind: 'lifetime';
  issued: string;       // ISO date
}

export type VerifyResult =
  | { ok: true; payload: LicensePayload }
  | { ok: false; reason: 'malformed' | 'mid_mismatch' | 'bad_signature' | 'blocked' };

export function buildPayload(mid: string, kind: LicensePayload['kind'] = 'lifetime', issued = new Date().toISOString()): LicensePayload {
  return { v: 1, mid, kind, issued };
}

export function payloadBytes(payload: LicensePayload): Buffer {
  return Buffer.from(JSON.stringify(payload), 'utf8');
}

export function encodeLicenseKey(payload: LicensePayload, signature: Buffer): string {
  return `RB1-${payloadBytes(payload).toString('base64url')}.${signature.toString('base64url')}`;
}

export function decodeLicenseKey(key: string): { payload: LicensePayload; signature: Buffer } | null {
  const trimmed = key.trim();
  if (!trimmed.startsWith('RB1-')) return null;
  const body = trimmed.slice(4);
  const dot = body.indexOf('.');
  if (dot <= 0 || dot === body.length - 1) return null;
  try {
    const payload = JSON.parse(Buffer.from(body.slice(0, dot), 'base64url').toString('utf8')) as LicensePayload;
    const signature = Buffer.from(body.slice(dot + 1), 'base64url');
    if (!payload || payload.v !== 1 || typeof payload.mid !== 'string' || payload.kind !== 'lifetime' || typeof payload.issued !== 'string') return null;
    if (signature.length === 0) return null;
    return { payload, signature };
  } catch {
    return null;
  }
}

/** Verify a key against this machine's MID using the embedded owner public key. */
export function verifyLicenseKey(key: string, mid: string, publicKeyPem: string, opts?: { blockedMids?: string[] }): VerifyResult {
  const decoded = decodeLicenseKey(key);
  if (!decoded) return { ok: false, reason: 'malformed' };
  if (opts?.blockedMids?.includes(decoded.payload.mid)) return { ok: false, reason: 'blocked' };
  if (decoded.payload.mid !== mid) return { ok: false, reason: 'mid_mismatch' };
  let valid = false;
  try {
    valid = crypto.verify('sha256', payloadBytes(decoded.payload), publicKeyPem, decoded.signature);
  } catch {
    valid = false;
  }
  return valid ? { ok: true, payload: decoded.payload } : { ok: false, reason: 'bad_signature' };
}

export function reasonAr(reason: 'malformed' | 'mid_mismatch' | 'bad_signature' | 'blocked'): string {
  switch (reason) {
    case 'malformed': return 'صيغة المفتاح غير صحيحة — تأكد من نسخه كاملاً بدون مسافات';
    case 'mid_mismatch': return 'هذا المفتاح صادر لجهاز آخر — أرسل رقم جهازك للاستاذ روبي';
    case 'bad_signature': return 'المفتاح غير صالح أو تم تعديله';
    case 'blocked': return 'هذا المفتاح موقوف — تواصل مع الإدارة';
  }
}
