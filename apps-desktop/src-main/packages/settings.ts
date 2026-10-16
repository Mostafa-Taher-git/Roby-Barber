// Settings domain — salon info, templates, offers, logo files. Validation lives here, UI only displays errors.
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { offers, salon, templates, type BetterSQLiteDatabase } from '../db/schema';
import { log } from '../logger';

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
  let logoDataUrl: string | null = null;
  if (row.logoPath && logosDir) {
    try {
      const file = path.join(logosDir, path.basename(row.logoPath));
      const buf = fs.readFileSync(file);
      const ext = path.extname(file).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      logoDataUrl = `data:${mime};base64,${buf.toString('base64')}`;
    } catch { logoDataUrl = null; }
  }
  return { ...row, logoDataUrl };
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

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** Persist an uploaded logo (data URL → file under userData/logos/) and point salon.logo_path at it. */
export function saveLogo(db: BetterSQLiteDatabase, dataUrl: string, logosDir: string) {
  const m = /^data:image\/(png|jpe?g|webp);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) throw new Error('ملف الشعار يجب أن يكون صورة PNG أو JPG (حتى 2 ميجا)');
  const ext = m[1] === 'png' ? '.png' : m[1] === 'webp' ? '.webp' : '.jpg';
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > LOGO_MAX_BYTES) throw new Error('حجم الشعار أكبر من 2 ميجا');
  fs.mkdirSync(logosDir, { recursive: true });
  const name = `logo-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(logosDir, name), buf);
  const row = salonRow(db);
  if (!row) throw new Error('بيانات الصالون غير موجودة');
  // Remove the previous logo file (if any) — DB stores only the current path
  if (row.logoPath) {
    try { fs.rmSync(path.join(logosDir, path.basename(row.logoPath)), { force: true }); } catch { /* stale file, ignore */ }
  }
  db.update(salon).set({ logoPath: name }).where(eq(salon.id, row.id)).run();
  log.info('logo saved', name);
  return { logoPath: name };
}

export function resetLogo(db: BetterSQLiteDatabase, logosDir: string) {
  const row = salonRow(db);
  if (!row) throw new Error('بيانات الصالون غير موجودة');
  if (row.logoPath) {
    try { fs.rmSync(path.join(logosDir, path.basename(row.logoPath)), { force: true }); } catch { /* already gone */ }
  }
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
