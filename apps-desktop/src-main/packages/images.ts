// Shared image file handling (logo, staff photos): data URL → file under userData, and back.
import fs from 'node:fs';
import path from 'node:path';

const MAX_BYTES = 2 * 1024 * 1024;

/** Persist a data-URL image as <dir>/<prefix>-<ts>.<ext>; returns the stored filename. */
export function saveImageDataUrl(dir: string, prefix: string, dataUrl: string): string {
  const m = /^data:image\/(png|jpe?g|webp);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) throw new Error('الصورة يجب أن تكون PNG أو JPG (حتى 2 ميجا)');
  const ext = m[1] === 'png' ? '.png' : m[1] === 'webp' ? '.webp' : '.jpg';
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_BYTES) throw new Error('حجم الصورة أكبر من 2 ميجا');
  fs.mkdirSync(dir, { recursive: true });
  const name = `${prefix}-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  return name;
}

/** Read a stored image back as a data URL (null when missing). */
export function readImageDataUrl(dir: string | undefined, fileName: string | null): string | null {
  if (!fileName || !dir) return null;
  try {
    const file = path.join(dir, path.basename(fileName));
    const buf = fs.readFileSync(file);
    const ext = path.extname(file).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export function removeImage(dir: string | undefined, fileName: string | null) {
  if (!fileName || !dir) return;
  try { fs.rmSync(path.join(dir, path.basename(fileName)), { force: true }); } catch { /* stale file, ignore */ }
}
