// Renderer-safe wrapper. In Electron it proxies IPC; in browser prototype mode it falls back to seed data
// so Phase 0-2 UI can be reviewed without packaging the app.
import { appointments as seedAppts, chairs as seedChairs, services } from './data/seed';
import type { Appt, Chair, Customer, RobyApi, Service } from './api';

const api: RobyApi = {
  async overview() {
    const waiting = seedAppts.filter((a) => a.status === 'waiting').length;
    return { todaySales: 7500, appointments: seedAppts.length, waiting, criticalStock: 3, staff: 5, lastBackup: null };
  },
  async chairs() { return seedChairs as Chair[]; },
  async appointments(filter = 'all') {
    return (filter === 'all' ? seedAppts : seedAppts.filter((a) => a.status === filter)) as Appt[];
  },
  async waitingQueue() { return seedAppts.filter((a) => a.status === 'waiting') as Appt[]; },
  async createBooking(input) {
    const appt = { id: `RB-${Math.floor(1000 + Math.random() * 9000)}`, status: 'waiting' as const, ...input };
    return appt as Appt;
  },
  async seatBooking(id) { return seedAppts.find((a) => a.id === id) as Appt; },
  async finishChair(_chairId) { return seedChairs[0] as Chair; },
  async callNext() {},
  async services() { return services as Service[]; },
  async customers(query = '') {
    const list: Customer[] = [];
    return list.filter((c) => !query || c.name.includes(query));
  },
  async logActivity() {},
  async activity() { return []; },
};

export function useApi(): RobyApi {
  return typeof window !== 'undefined' && window.roby ? window.roby : api;
}
