import { ipcMain } from 'electron';
import { getDb } from '../db/client';
import { listAppointments, listChairs, createBooking, seatBooking, seatNextWaiting, finishChair } from '../packages/queue';
import { listServices, listCustomers } from '../packages/catalog';
import { overview, logActivity, activity } from '../packages/reports';
import { log } from '../logger';

type Handler = (args: unknown[]) => unknown;
const handlers: Record<string, Handler> = {
  'overview': () => overview(getDb()),
  'chairs': () => listChairs(getDb()),
  'appointments': ([filter]) => listAppointments(getDb(), filter as string | undefined),
  'waiting-queue': () => listAppointments(getDb(), 'waiting'),
  'create-booking': ([input]) => createBooking(getDb(), input as Parameters<typeof createBooking>[1]),
  'seat-booking': ([id]) => seatBooking(getDb(), id as string),
  'finish-chair': ([id]) => finishChair(getDb(), id as number),
  'call-next': () => {
    const next = seatNextWaiting(getDb());
    if (next) logActivity(getDb(), `تم إجلاس الزبون ${next.name} (${next.id})`);
    return next;
  },
  'services': () => listServices(getDb()),
  'customers': ([query]) => listCustomers(getDb(), (query as string) ?? ''),
  'log-activity': ([text]) => logActivity(getDb(), text as string),
  'activity': () => activity(getDb()),
};

export function setupIpc() {
  for (const [name, fn] of Object.entries(handlers)) {
    ipcMain.handle(`roby:${name}`, (_e, ...args) => {
      try {
        return fn(args);
      } catch (err) {
        log.error(`ipc ${name} failed`, err);
        throw err;
      }
    });
  }
}

