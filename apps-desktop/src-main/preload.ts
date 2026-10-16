import { contextBridge, ipcRenderer } from 'electron';

// window.roby.invoke(channel, ...args) — main owns all DB access (DESIGN doc §8).
const channels = [
  'overview', 'chairs', 'appointments', 'waiting-queue',
  'create-booking', 'seat-booking', 'finish-chair', 'call-next',
  'services', 'staff', 'customers', 'log-activity', 'activity',
  'checkout', 'sales',
  'financials', 'expenses', 'add-expense', 'delete-expense', 'z-report',
  'salon', 'save-salon', 'save-logo', 'reset-logo',
  'save-service', 'delete-service',
  'templates', 'save-templates',
  'offers', 'save-offer', 'delete-offer',
  'staff-roster', 'payroll', 'save-staff', 'delete-staff', 'add-advance', 'delete-advance', 'pay-staff',
  'inventory', 'save-stock', 'delete-stock', 'restock',
  'license-state', 'activate',
  'wa-share',
  'backup-now', 'backup-list', 'backup-status', 'backup-open-folder', 'backup-export', 'backup-import', 'restore-backup',
] as const;

contextBridge.exposeInMainWorld('roby', {
  invoke: (channel: string, ...args: unknown[]) => {
    if (!(channels as readonly string[]).includes(channel)) {
      return Promise.reject(new Error(`blocked channel: ${channel}`));
    }
    return ipcRenderer.invoke(`roby:${channel}`, ...args);
  },
  onLicenseChanged: (cb: () => void) => {
    ipcRenderer.on('roby:license-changed', () => cb());
  },
  version: '0.1.0',
  phase: 7,
});
