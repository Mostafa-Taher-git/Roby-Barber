// One-shot brand icon generator: renders the app mark in Electron → build/icon.ico (multi-size) + build/icon.png.
// Run from apps-desktop:  npx electron scripts/make-icon.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, '..', 'build');
const SIZES = [256, 128, 64, 48, 32, 24, 16];

const MARK_HTML = `<!doctype html><html><body style="margin:0;background:transparent">
<div style="width:512px;height:512px;box-sizing:border-box;border-radius:104px;
  background:radial-gradient(circle at 50% 36%, #232c40 0%, #1c2436 45%, #0f141f 78%);
  border:12px solid rgba(245,184,66,.30);display:grid;place-items:center">
  <div style="width:408px;height:408px;border-radius:50%;border:10px solid #f5b842;
    display:grid;place-items:center;box-shadow:0 0 60px rgba(245,184,66,.25), inset 0 0 48px rgba(245,184,66,.12)">
    <span style="font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:255px;
      color:#f5b842;line-height:1;transform:translateY(-8px);
      text-shadow:0 8px 30px rgba(245,184,66,.45)">R</span>
  </div>
</div></body></html>`;

async function render() {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    useContentSize: true,
    webPreferences: { backgroundThrottling: false },
  });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(MARK_HTML));
  win.showInactive(); // capturePage needs a visible frame
  await new Promise((r) => setTimeout(r, 400));
  const img = await win.webContents.capturePage();
  win.destroy();
  return img;
}

function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = [];
  for (const { size, buf } of pngs) {
    const e = Buffer.alloc(16);
    const dim = size >= 256 ? 0 : size; // 0 means 256 in the ICO format
    e.writeUInt8(dim, 0);
    e.writeUInt8(dim, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
}

app.whenReady().then(async () => {
  const img = await render();
  const pngs = SIZES.map((size) => ({ size, buf: img.resize({ width: size, height: size, quality: 'best' }).toPNG() }));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'icon.ico'), buildIco(pngs));
  fs.writeFileSync(path.join(OUT, 'icon.png'), img.toPNG());
  console.log(`icon.ico (${SIZES.join('/')}) + icon.png written to ${OUT}`);
  app.exit(0);
}).catch((err) => {
  console.error('icon generation failed:', err);
  app.exit(1);
});
