// Tiny UI formatting helpers.
export const egp = (n: number) => `${Math.round(n).toLocaleString()} ج.م`;

export const arTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

export const arDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
