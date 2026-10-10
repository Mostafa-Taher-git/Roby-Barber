// Phase 0 seed — trimmed from legacy app.js defaultState (in-memory only, no DB yet)
export type ChairStatus = 'busy' | 'free';
export type ApptStatus = 'waiting' | 'in_chair' | 'done';

export interface Service { id: string; title: string; cat: string; price: number; duration: string; }
export interface Chair { id: number; num: number; barber: string; status: ChairStatus; customer: string; service: string; remMins: number; }
export interface Appt { id: string; name: string; phone: string; service: string; barber: string; time: string; status: ApptStatus; payment: string; price: number; }

export const services: Service[] = [
  { id: 'srv_1', title: 'قص شعر استايل وفيد + سشوار', cat: 'hair', price: 120, duration: '35 دقيقة' },
  { id: 'srv_2', title: 'تظبيط وتحديد دقن بالموس والخيط', cat: 'beard', price: 70, duration: '20 دقيقة' },
  { id: 'srv_3', title: 'كومبو شياكة: شعر + لحية كاملة', cat: 'packages', price: 170, duration: '50 دقيقة' },
  { id: 'srv_4', title: 'تنظيف بشرة هيدرافاشيل وبخار', cat: 'skin', price: 200, duration: '40 دقيقة' },
  { id: 'srv_5', title: 'ماسك فحم أسود', cat: 'skin', price: 60, duration: '15 دقيقة' },
  { id: 'srv_6', title: 'فرد بروتين علاجي', cat: 'hair', price: 450, duration: '75 دقيقة' },
  { id: 'srv_7', title: 'باقة العريس الملكية VIP', cat: 'packages', price: 1200, duration: '150 دقيقة' },
  { id: 'srv_8', title: 'واكس شعر مات بريميوم', cat: 'retail', price: 130, duration: 'منتج بيع' },
  { id: 'srv_9', title: 'زيت لحية بالروزماري', cat: 'retail', price: 160, duration: 'منتج بيع' },
];

export const chairs: Chair[] = [
  { id: 1, num: 1, barber: 'الأسطى أحمد خليل', status: 'busy', customer: 'م/ طارق عبد العزيز', service: 'قص شعر + تظبيط لحية', remMins: 10 },
  { id: 2, num: 2, barber: 'الأسطى أنور عسران', status: 'free', customer: '-', service: 'الكرسي شاغر وجاهز', remMins: 0 },
  { id: 3, num: 3, barber: 'الأسطى جاسم كيتش', status: 'busy', customer: 'د/ شريف رمزي', service: 'جلسة هيدرافاشيل وبخار', remMins: 25 },
  { id: 4, num: 4, barber: 'كابتن روبي باربر', status: 'free', customer: '-', service: 'متاح للحجز VIP', remMins: 0 },
  { id: 5, num: 5, barber: 'الأسطى إبراهيم سعد', status: 'free', customer: '-', service: 'جاهز للزبون التالي', remMins: 0 },
];

export const appointments: Appt[] = [
  { id: 'RB-1082', name: 'محمد طارق الشريف', phone: '01012345678', service: 'كومبو شياكة (شعر + لحية)', barber: 'الأسطى أحمد خليل', time: '04:00 م', status: 'waiting', payment: 'إنستاباي', price: 170 },
  { id: 'RB-1083', name: 'حسام حسن الدالي', phone: '01123456789', service: 'قص شعر وتدريج فيد', barber: 'الأسطى إبراهيم سعد', time: '04:30 م', status: 'waiting', payment: 'كاش', price: 120 },
  { id: 'RB-1084', name: 'طارق عبد العزيز', phone: '01234567890', service: 'قص شعر + تظبيط لحية', barber: 'الأسطى أحمد خليل', time: '03:30 م', status: 'in_chair', payment: 'كاش', price: 170 },
  { id: 'RB-1085', name: 'د/ شريف رمزي', phone: '01099881122', service: 'تنظيف بشرة هيدرافاشيل', barber: 'الأسطى جاسم كيتش', time: '03:45 م', status: 'in_chair', payment: 'فيزا', price: 200 },
  { id: 'RB-1080', name: 'كريم محمود يونس', phone: '01511223344', service: 'باقة العريس الملكية', barber: 'كابتن روبي باربر', time: '01:00 م', status: 'done', payment: 'إنستاباي', price: 1200 },
];

// Pure money math (mirrors packages/pos/totals.ts in final build — tested here first)
export function calcTotal(subtotal: number, discount: number, tip: number) {
  return subtotal - discount + tip;
}
