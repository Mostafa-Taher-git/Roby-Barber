// WhatsApp compose (Phase 6) — pure functions only, money-free, no DB.
// Templates live in the DB (editable in Settings); these helpers normalize phones and fill placeholders.
export type WaKind = 'ticket' | 'receipt' | 'reminder' | 'campaign' | 'custom';

export const WA_KIND_LABELS: Record<WaKind, string> = {
  ticket: 'تذكرة حجز',
  receipt: 'فاتورة',
  reminder: 'تذكير بزيارة',
  campaign: 'عرض ترويجي',
  custom: 'رسالة مخصصة',
};

/** Egyptian phones → wa.me international format (no +, no spaces). Returns null when unusable. */
export function normalizeEgyptPhone(raw: string): string | null {
  const digits = (raw ?? '').replace(/[^\d]/g, '').replace(/^00/, '');
  if (!digits) return null;
  if (digits.length === 12 && digits.startsWith('20')) return digits;              // 201012345678
  if (digits.length === 11 && digits.startsWith('0')) return `20${digits.slice(1)}`; // 01012345678 → 201012345678
  if (digits.length === 10 && digits.startsWith('1')) return `20${digits}`;        // 1012345678 → 201012345678
  return digits.length >= 8 ? digits : null;                                       // already-international numbers
}

/** Replace {key} placeholders; unknown tokens are left visible so the barber notices them. */
export function fillTemplate(body: string, vars: Record<string, string | number>): string {
  return body.replace(/\{(\w+)\}/g, (token, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : token);
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
