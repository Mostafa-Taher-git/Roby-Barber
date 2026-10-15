import { contextBridge, ipcRenderer } from 'electron';

// window.roby.invoke(channel, ...args) — main owns all DB access (DESIGN doc §8).
const channels = [
  'overview', 'chairs', 'appointments', 'waiting-queue',
  'create-booking', 'seat-booking', 'finish-chair', 'call-next',
  'services', 'customers', 'log-activity', 'activity',
] as const;

contextBridge.exposeInMainWorld('roby', {
  invoke: (channel: string, ...args: unknown[]) => {
    if (!(channels as readonly string[]).includes(channel)) {
      return Promise.reject(new Error(`blocked channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  version: '0.1.0',
  phase: 1,
});
