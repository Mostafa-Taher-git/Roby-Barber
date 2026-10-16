import { app, BrowserWindow, crashReporter, dialog, Menu, shell } from 'electron';
import { join } from 'node:path';
import { getDb, runMigrations, rawClient } from './db/client';
import { setupIpc } from './ipc';
import { licenseState } from './packages/license';
import { PUBLIC_KEY_PEM } from './packages/license/publicKey';
import { createBackup } from './packages/backup';
import { log } from './logger';

crashReporter.start({ uploadToServer: false });
let win: BrowserWindow | null = null;
const REVALIDATE_MS = 24 * 60 * 60 * 1000; // re-verify license on launch + every 24h (PROJECT_PLAN §7)
const BACKUP_MS = 10 * 60 * 1000; // auto-backup every 10 min + on quit (PROJECT_PLAN §8)
const backupsDir = () => join(app.getPath('userData'), 'backups');

function snapshot() {
  try {
    createBackup(rawClient(), backupsDir());
  } catch (err) {
    log.error('auto backup failed', err); // never let a backup failure take the app down
  }
}

async function createWindow() {
  // DB boots before UI — Phase 1 acceptance: DB persists after reboot
  const db = getDb();
  runMigrations(db);
  setupIpc();
  // License boot: fresh PC starts a 7-day trial; the renderer shows the lock screen when it ends.
  const license = licenseState(db, PUBLIC_KEY_PEM);
  log.info('license state', { status: license.status, mid: license.mid, daysLeft: license.daysLeft });
  const revalidate = () => {
    const next = licenseState(db, PUBLIC_KEY_PEM);
    if (next.status !== license.status) {
      log.warn('license state changed', { from: license.status, to: next.status });
      win?.webContents.send('roby:license-changed');
    }
  };
  const licenseTimer = setInterval(revalidate, REVALIDATE_MS);
  licenseTimer.unref?.();

  // Phase 7 — auto-backup: first snapshot shortly after boot, then every 10 min, plus on quit.
  const backupTimer = setInterval(snapshot, BACKUP_MS);
  backupTimer.unref?.();
  setTimeout(snapshot, 90 * 1000).unref?.();
  app.on('before-quit', snapshot);

  // Production hardening (Phase 5): no DevTools, no menu, no app menu accelerators in packaged builds.
  if (app.isPackaged) Menu.setApplicationMenu(null);

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      devTools: !app.isPackaged,
    },
  });
  win.on('unresponsive', () => log.error('window unresponsive'));
  win.webContents.on('render-process-gone', (_e, details) => log.error('renderer gone', details));
  // External links (wa.me WhatsApp, etc.) open in the system browser — never inside the app shell.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
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
  // OK states: shell + nav + live data badge, OR the license lock screen (locked/expired is a valid boot).
  if (process.env.ROBY_UI_CHECK) {
    let probe: { shell?: boolean; nav?: number; ready?: boolean; lock?: boolean } = {};
    for (let i = 0; i < 40; i++) {
      probe = await win.webContents.executeJavaScript(
        '({ shell: !!document.querySelector(".topbar") && !!document.querySelector(".sidenav"), nav: document.querySelectorAll(".sidenav button").length, ready: !!document.querySelector(".badge.ok"), lock: !!document.querySelector(".lock-card") })',
      );
      if ((probe.shell && probe.nav && probe.ready) || probe.lock) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    log.info('ui check', probe);
    app.exit((probe.shell && (probe.nav ?? 0) > 0 && probe.ready) || probe.lock ? 0 : 2);
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
