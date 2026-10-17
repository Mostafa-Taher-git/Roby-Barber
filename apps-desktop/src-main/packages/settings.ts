// Settings domain — salon info, templates, offers, logo files, app key-value settings.
// Validation lives here, UI only displays errors.
import { eq } from 'drizzle-orm';
import { appSettings, offers, salon, templates, type BetterSQLiteDatabase } from '../db/schema';
import { log } from '../logger';
import { readImageDataUrl, removeImage, saveImageDataUrl } from './images';
import { normalizeEgyptPhone } from './whatsapp/compose';

export interface SalonRow {
  id: string; nameAr: string; address: string; phone: string;
  instapay: string; vodafone: string; logoPath: string | null;
}

function salonRow(db: BetterSQLiteDatabase): SalonRow | undefined {
  return db.select().from(salon).all()[0];
}

export function getSalon(db: BetterSQLiteDatabase, logosDir?: string) {
  const row = salonRow(db);
  if (!row) throw new Error('بيانات الصالون غير موجودة');
  return { ...row, logoDataUrl: readImageDataUrl(logosDir, row.logoPath) };
}

const PHONE_RE = /^01\d{9}$/;

export function saveSalon(db: BetterSQLiteDatabase, input: Partial<SalonRow>) {
  const row = salonRow(db);
  if (!row) throw new Error('بيانات الصالون غير موجودة');
  const nameAr = (input.nameAr ?? row.nameAr).trim();
  if (!nameAr) throw new Error('اسم الصالون مطلوب');
  const phone = (input.phone ?? row.phone).trim();
  if (phone && !PHONE_RE.test(phone)) throw new Error('رقم تليفون الصالون غير صحيح (01xxxxxxxxx)');
  const instapay = (input.instapay ?? row.instapay).trim();
  db.update(salon).set({
    nameAr,
    address: (input.address ?? row.address).trim(),
    phone,
    instapay,
    vodafone: (input.vodafone ?? row.vodafone).trim(),
  }).where(eq(salon.id, row.id)).run();
  log.info('salon saved');
  return getSalon(db);
}

/** Persist an uploaded logo (data URL → file under userData/logos/) and point salon.logo_path at it. */
export function saveLogo(db: BetterSQLiteDatabase, dataUrl: string, logosDir: string) {
  const name = saveImageDataUrl(logosDir, 'logo', dataUrl);
  const row = salonRow(db);
  if (!row) throw new Error('بيانات الصالون غير موجودة');
  // Remove the previous logo file (if any) — DB stores only the current path
  removeImage(logosDir, row.logoPath);
  db.update(salon).set({ logoPath: name }).where(eq(salon.id, row.id)).run();
  log.info('logo saved', name);
  return { logoPath: name };
}

export function resetLogo(db: BetterSQLiteDatabase, logosDir: string) {
  const row = salonRow(db);
  if (!row) throw new Error('بيانات الصالون غير موجودة');
  removeImage(logosDir, row.logoPath);
  db.update(salon).set({ logoPath: null }).where(eq(salon.id, row.id)).run();
  return { logoPath: null };
}

export function listTemplates(db: BetterSQLiteDatabase) {
  return db.select().from(templates).all().map((t) => ({ id: t.id, kind: t.kind, bodyAr: t.bodyAr }));
}

export function saveTemplates(db: BetterSQLiteDatabase, list: { id: string; bodyAr: string }[]) {
  for (const item of list) {
    if (!item.bodyAr.trim()) throw new Error('نص القالب لا يمكن أن يكون فارغاً');
    db.update(templates).set({ bodyAr: item.bodyAr.trim() }).where(eq(templates.id, item.id)).run();
  }
  log.info('templates saved', list.length);
  return listTemplates(db);
}

export interface OfferRow { id: string; title: string; descAr: string; price: number; active: number }

export function listOffers(db: BetterSQLiteDatabase, onlyActive = false) {
  return db.select().from(offers).all()
    .filter((o) => (onlyActive ? o.active === 1 : true))
    .map((o) => ({ id: o.id, title: o.title, descAr: o.descAr, price: o.price, active: o.active }));
}

export function saveOffer(db: BetterSQLiteDatabase, input: Partial<OfferRow> & { title: string }) {
  const title = input.title.trim();
  if (!title) throw new Error('عنوان العرض مطلوب');
  const price = Math.round(input.price ?? 0);
  if (price < 0) throw new Error('سعر العرض لا يمكن أن يكون سالباً');
  if (input.id) {
    const row = db.select().from(offers).where(eq(offers.id, input.id)).get();
    if (!row) throw new Error('العرض غير موجود');
    db.update(offers).set({ title, descAr: (input.descAr ?? row.descAr).trim(), price, active: input.active ?? row.active })
      .where(eq(offers.id, input.id)).run();
    log.info('offer updated', input.id);
    return listOffers(db).find((o) => o.id === input.id)!;
  }
  const id = `offer_${Date.now()}`;
  db.insert(offers).values({ id, title, descAr: (input.descAr ?? '').trim(), price, active: input.active ?? 1 }).run();
  log.info('offer added', id);
  return listOffers(db).find((o) => o.id === id)!;
}

export function deleteOffer(db: BetterSQLiteDatabase, id: string) {
  const row = db.select().from(offers).where(eq(offers.id, id)).get();
  if (!row) throw new Error('العرض غير موجود');
  db.delete(offers).where(eq(offers.id, id)).run();
  log.info('offer deleted', id);
  return { id };
}

// ---- app_settings key-value store (Phase 7+: user-editable runtime settings) ----

export const CONTACT_WHATSAPP_KEY = 'contact_whatsapp';

export function getSetting(db: BetterSQLiteDatabase, key: string): string | null {
  return db.select().from(appSettings).where(eq(appSettings.key, key)).get()?.value ?? null;
}

export function setSetting(db: BetterSQLiteDatabase, key: string, value: string) {
  db.insert(appSettings).values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } }).run();
}

/**
 * WhatsApp number the lock screen sends the MID to (the licence vendor).
 * Editable anytime in Settings; empty string = not configured yet.
 */
export function getContactWhatsapp(db: BetterSQLiteDatabase): string {
  return getSetting(db, CONTACT_WHATSAPP_KEY) ?? '';
}

/** Save the contact number (any Egyptian mobile format, stored international). Empty = clear it. */
export function setContactWhatsapp(db: BetterSQLiteDatabase, input: string): string {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) {
    db.delete(appSettings).where(eq(appSettings.key, CONTACT_WHATSAPP_KEY)).run();
    log.info('contact whatsapp cleared');
    return '';
  }
  const normalized = normalizeEgyptPhone(trimmed);
  if (!normalized) throw new Error('رقم واتساب التفعيل غير صالح — اكتب رقم موبايل صحيح (مثال: 01012345678)');
  setSetting(db, CONTACT_WHATSAPP_KEY, normalized);
  log.info('contact whatsapp updated', normalized);
  return normalized;
}
