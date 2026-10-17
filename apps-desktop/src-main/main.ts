import { app, BrowserWindow, crashReporter, dialog, Menu, shell } from 'electron';
import { existsSync } from 'node:fs';
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
const iconPath = () => join(__dirname, '..', 'build', 'icon.ico'); // dev only; packaged exe carries the icon

function snapshot() {
  try {
    createBackup(rawClient(), backupsDir());
  } catch (err) {
    log.error('auto backup failed', err); // never let a backup failure take the app down
  }
}

// Brand splash while the DB/UI boot — swapped out for the main window on first paint (Phase 7 polish).
const SPLASH_HTML = `<!doctype html><html dir="rtl"><body style="margin:0;background:#0f141f;color:#f8fafc;
  font-family:'Segoe UI',Tahoma,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100vh;user-select:none">
  <div style="width:76px;height:76px;border-radius:50%;border:4px solid #f5b842;display:grid;place-items:center;
    box-shadow:0 0 34px rgba(245,184,66,.35)">
    <span style="font-family:Georgia,serif;font-weight:700;font-size:46px;color:#f5b842;transform:translateY(-3px)">R</span>
  </div>
  <div style="margin-top:14px;font-size:22px;font-weight:800;color:#f5b842">روبي باربر</div>
  <div style="margin-top:4px;font-size:12px;color:#94a3b8">نظام إدارة صالون الحلاقة</div>
  <div style="margin-top:18px;width:150px;height:4px;border-radius:3px;background:#232c40;overflow:hidden">
    <div style="width:40%;height:100%;border-radius:3px;background:#f5b842;animation:slide 1.1s ease-in-out infinite"></div>
  </div>
  <style>@keyframes slide{0%{transform:translateX(140%)}100%{transform:translateX(-240%)}}</style>
</body></html>`;

function showSplash(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 430,
    height: 250,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#0f141f',
    webPreferences: { contextIsolation: true },
  });
  splash.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(SPLASH_HTML));
  return splash;
}

async function createWindow() {
  // DB boots before UI — Phase 1 acceptance: DB persists after reboot
  const db = getDb();
  runMigrations(db);
  setupIpc();
  // License boot: fresh PC starts a 7-day trial; the renderer shows the lock screen when it ends.
  const license = licenseState(db, PUBLIC_KEY_PEM);
  log.info('license state', { status: license.status, mid: license.mid, daysLeft: license.daysLeft });
  let lastStatus = license.status;
  const revalidate = () => {
    const next = licenseState(db, PUBLIC_KEY_PEM);
    if (next.status !== lastStatus) {
      log.warn('license state changed', { from: lastStatus, to: next.status });
      lastStatus = next.status;
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

  const splash = process.env.ROBY_UI_CHECK ? null : showSplash();

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    ...(existsSync(iconPath()) ? { icon: iconPath() } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      devTools: !app.isPackaged,
    },
  });
  win.once('ready-to-show', () => {
    splash?.destroy();
    win?.show();
  });
  setTimeout(() => splash?.destroy(), 8000).unref?.(); // safety: never trap the user behind a splash
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
