// Typed renderer API surface (preload exposes window.roby). Keeps renderer free of direct DB access.
export interface Service { id: string; title: string; cat: string; price: number; duration: string; desc: string | null; }
export interface Chair { id: number; num: number; barberId: string | null; status: string; customer: string; service: string; remMins: number; }
export interface Appt {
  id: string; name: string; phone: string; service: string; barber: string; time: string;
  status: 'waiting' | 'in_chair' | 'done'; payment: string; price: number;
}
export interface Customer { code: string; name: string; phone: string; visits: number; points: number; favBarber: string; lastVisit: string; vip: number; }

export interface RobyApi {
  overview(): Promise<{ todaySales: number; appointments: number; waiting: number; criticalStock: number; staff: number; lastBackup: string | null }>;
  chairs(): Promise<Chair[]>;
  appointments(filter?: 'all' | 'waiting' | 'in_chair' | 'done'): Promise<Appt[]>;
  waitingQueue(): Promise<Appt[]>;
  createBooking(input: { name: string; phone: string; service: string; barber: string; time: string; price: number; payment: string }): Promise<Appt>;
  seatBooking(id: string): Promise<Appt>;
  finishChair(chairId: number): Promise<Chair>;
  callNext(): Promise<void>;
  services(): Promise<Service[]>;
  customers(query?: string): Promise<Customer[]>;
  logActivity(text: string): Promise<void>;
  activity(): Promise<{ text: string; time: string }[]>;
}

declare global {
  interface Window { roby: RobyApi }
}
