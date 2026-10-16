// WhatsApp share (Phase 6) — composes the wa.me link from the editable template + logs the click.
// Offline by design: we only OPEN the chat in the system browser; WhatsApp itself handles delivery.
import { eq } from 'drizzle-orm';
import { salon, templates, type BetterSQLiteDatabase } from '../../db/schema';
import { fillTemplate, normalizeEgyptPhone, waLink, WA_KIND_LABELS, type WaKind } from './compose';
import { logActivity } from '../reports';
import { log } from '../../logger';

export interface WaShareInput {
  kind: WaKind;
  phone: string;
  vars?: Record<string, string | number>;
  text?: string; // only for kind 'custom' (or to override the template on purpose)
}
export interface WaShareResult {
  url: string;
  text: string;
  label: string;
  to: string;
}

export function waShare(db: BetterSQLiteDatabase, input: WaShareInput): WaShareResult {
  const label = WA_KIND_LABELS[input.kind];
  if (!label) throw new Error('نوع الرسالة غير معروف');

  const to = normalizeEgyptPhone(input.phone);
  if (!to) throw new Error('رقم الموبايل غير صالح — تأكد من الرقم');

  let body = (input.text ?? '').trim();
  if (!body) {
    if (input.kind === 'custom') throw new Error('الرسالة فاضية — اكتب نص الرسالة الأول');
    const tpl = db.select().from(templates).where(eq(templates.kind, input.kind)).get();
    if (!tpl) throw new Error('قالب الرسالة غير موجود — افتح الإعدادات وتأكد من القوالب');
    body = tpl.bodyAr;
  }

  const salonRow = db.select().from(salon).get();
  const text = fillTemplate(body, { salon: salonRow?.nameAr ?? 'روبي باربر', ...(input.vars ?? {}) });
  const vars = input.vars ?? {};
  const who = typeof vars.name === 'string' && vars.name.trim() ? vars.name.trim() : to;
  logActivity(db, `واتساب (${label}) → ${who}`);
  log.info('whatsapp share', { kind: input.kind, to });
  return { url: waLink(to, text), text, label, to };
}
