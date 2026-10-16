import { app, BrowserWindow, crashReporter, dialog } from 'electron';
import { join } from 'node:path';
import { getDb, runMigrations } from './db/client';
import { setupIpc } from './ipc';
import { log } from './logger';

crashReporter.start({ uploadToServer: false });
let win: BrowserWindow | null = null;

async function createWindow() {
  // DB boots before UI — Phase 1 acceptance: DB persists after reboot
  const db = getDb();
  runMigrations(db);
  setupIpc();
  log.info('db + ipc ready');

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  win.on('unresponsive', () => log.error('window unresponsive'));
  win.webContents.on('render-process-gone', (_e, details) => log.error('renderer gone', details));
  // Surface renderer errors in app.log (blank-window debugging, DESIGN doc §9)
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 3) log.error('renderer console', message);
    else if (level === 2) log.warn('renderer console', message);
  });

  const devUrl = process.env.VITE_DEV_URL;
  if (devUrl) {
    await win.loadURL(devUrl);
  } else {
    // Packaged/CI renderer (built by src-renderer → dist)
    await win.loadFile(join(__dirname, '..', 'src-renderer', 'dist', 'index.html'));
  }

  // Headless UI self-check (used by boot verification: ROBY_UI_CHECK=1)
  // Polls until the shell rendered AND live DB data arrived (badge "قاعدة البيانات متصلة").
  if (process.env.ROBY_UI_CHECK) {
    let probe: { shell?: boolean; nav?: number; ready?: boolean } = {};
    for (let i = 0; i < 40; i++) {
      probe = await win.webContents.executeJavaScript(
        '({ shell: !!document.querySelector(".topbar") && !!document.querySelector(".sidenav"), nav: document.querySelectorAll(".sidenav button").length, ready: !!document.querySelector(".badge.ok") })',
      );
      if (probe.shell && probe.nav && probe.ready) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    log.info('ui check', probe);
    app.exit(probe.shell && (probe.nav ?? 0) > 0 && probe.ready ? 0 : 2);
  }
}

app.whenReady().then(createWindow).catch((err) => {
  log.error('boot failed', err);
  dialog.showErrorBox('تعذر تشغيل التطبيق', String(err instanceof Error ? err.message : err));
  app.exit(1);
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('second-instance', () => win?.focus());
if (!app.requestSingleInstanceLock()) app.quit();
process.on('uncaughtException', (err) => log.error('uncaught', err));
