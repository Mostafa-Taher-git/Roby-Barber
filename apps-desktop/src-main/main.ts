import { app, BrowserWindow, crashReporter } from 'electron';
import path from 'node:path';
import { getDb, runMigrations } from './db/client';
import { log } from './logger';

crashReporter.start({ uploadToServer: false });
let win: BrowserWindow | null = null;

async function createWindow() {
  // DB boots before UI — Phase 1 acceptance: DB persists after reboot
  const db = getDb();
  runMigrations(db);
  log.info('db ready');

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  win.on('unresponsive', () => log.error('window unresponsive'));
  win.webContents.on('render-process-gone', (_e, details) => log.error('renderer gone', details));

  const devUrl = process.env.VITE_DEV_URL;
  if (devUrl) {
    await win.loadURL(devUrl);
  } else {
    // Phase 0 prototype dist until Phase 2 renderer moves in
    await win.loadFile(path.join(__dirname, '..', '..', 'apps-prototype', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('second-instance', () => win?.focus());
if (!app.requestSingleInstanceLock()) app.quit();
process.on('uncaughtException', (err) => log.error('uncaught', err));
