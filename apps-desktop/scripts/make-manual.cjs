// Renders docs/manual.html → docs/RobyBarber-User-Manual-AR.pdf via Electron printToPDF.
// Run from apps-desktop:  npx electron scripts/make-manual.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', '..', 'docs', 'manual.html');
const OUT = path.join(__dirname, '..', '..', 'docs', 'RobyBarber-User-Manual-AR.pdf');

const FOOTER = `
<div style="width:100%;font-size:9px;color:#999;text-align:center;font-family:'Segoe UI',Tahoma,sans-serif;direction:rtl">
  روبي باربر — دليل الاستخدام — صفحة <span class="pageNumber"></span> من <span class="totalPages"></span>
</div>`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  await win.loadFile(SRC);
  await new Promise((r) => setTimeout(r, 300));
  const pdf = await win.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: FOOTER,
    margins: { top: 0.7, bottom: 0.8, left: 0.55, right: 0.55 },
  });
  fs.writeFileSync(OUT, pdf);
  console.log(`manual PDF written: ${OUT} (${(pdf.length / 1024).toFixed(0)} KB)`);
  app.exit(0);
}).catch((err) => {
  console.error('manual generation failed:', err);
  app.exit(1);
});
