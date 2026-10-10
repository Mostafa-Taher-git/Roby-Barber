import { contextBridge } from 'electron';

// Phase 1: minimal safe bridge. No direct DB access from renderer.
contextBridge.exposeInMainWorld('roby', {
  version: '0.1.0',
  phase: 1,
});
