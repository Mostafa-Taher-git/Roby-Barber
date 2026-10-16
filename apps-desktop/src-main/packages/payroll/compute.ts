// Pure payroll math (DESIGN §6): net = salary + round(revenue × comm%) + tips − advances.
// No DB access — the DB-facing wrapper in ./index.ts feeds it and the smoke test proves the numbers.
export interface PayrollStaffRow {
  id: string; nameAr: string; role: string; commPct: number; salary: number; photoPath: string | null;
}
export interface SalesAggRow { barber: string; revenue: number; tips: number; count: number }
export interface AdvanceRow { id: string; staffId: string; amount: number; note: string; at: string }
export interface PaymentRow { id: string; staffId: string; amount: number; month: string; at: string }

export interface PayrollItem {
  staffId: string; nameAr: string; role: string; commPct: number; salary: number; photoPath: string | null;
  month: string; revenue: number; count: number; tips: number; commission: number;
  advancesTotal: number; advancesList: AdvanceRow[];
  net: number;
  paid: { id: string; amount: number; at: string } | null;
}

export const monthKey = (iso: string) => iso.slice(0, 7); // YYYY-MM

/** Group raw sales rows into per-barber aggregates for one month.
 * `revenue` = service work only (subtotal − discount) — tips are added separately in the formula. */
export function aggregateSales(rows: { barber: string; subtotal: number; discount: number; tip: number; at: string }[], month: string): SalesAggRow[] {
  const byBarber = new Map<string, SalesAggRow>();
  for (const r of rows) {
    if (monthKey(r.at) !== month) continue;
    const agg = byBarber.get(r.barber) ?? { barber: r.barber, revenue: 0, tips: 0, count: 0 };
    agg.revenue += r.subtotal - r.discount;
    agg.tips += r.tip;
    agg.count += 1;
    byBarber.set(r.barber, agg);
  }
  return [...byBarber.values()];
}

export function computePayroll(
  staffRows: PayrollStaffRow[],
  salesAgg: SalesAggRow[],
  advances: AdvanceRow[],
  payments: PaymentRow[],
  month: string,
) {
  const items: PayrollItem[] = staffRows.map((s) => {
    const agg = salesAgg.find((a) => a.barber === s.nameAr);
    const revenue = agg?.revenue ?? 0;
    const tips = agg?.tips ?? 0;
    const count = agg?.count ?? 0;
    const commission = Math.round((revenue * s.commPct) / 100);
    const advancesList = advances.filter((a) => a.staffId === s.id && monthKey(a.at) === month);
    const advancesTotal = advancesList.reduce((sum, a) => sum + a.amount, 0);
    const payment = payments.find((p) => p.staffId === s.id && p.month === month) ?? null;
    return {
      staffId: s.id, nameAr: s.nameAr, role: s.role, commPct: s.commPct, salary: s.salary, photoPath: s.photoPath,
      month, revenue, count, tips, commission, advancesTotal, advancesList,
      net: s.salary + commission + tips - advancesTotal,
      paid: payment ? { id: payment.id, amount: payment.amount, at: payment.at } : null,
    };
  });
  const totals = items.reduce(
    (acc, it) => ({
      salary: acc.salary + it.salary, revenue: acc.revenue + it.revenue, commission: acc.commission + it.commission,
      tips: acc.tips + it.tips, advances: acc.advances + it.advancesTotal, net: acc.net + it.net,
    }),
    { salary: 0, revenue: 0, commission: 0, tips: 0, advances: 0, net: 0 },
  );
  return { month, items, totals };
}
