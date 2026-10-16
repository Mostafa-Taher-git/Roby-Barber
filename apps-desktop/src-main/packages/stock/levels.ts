// Pure stock levels (DESIGN §6): critical = qty <= min_qty; value totals for the S6 KPI cards.
export interface StockItem { id: string; name: string; type: string; cost: number; price: number; qty: number; minQty: number }

export const isCritical = (qty: number, minQty: number) => qty <= minQty;

export function stockLevels(items: StockItem[]) {
  const critical = items.filter((i) => isCritical(i.qty, i.minQty));
  const costValue = items.reduce((sum, i) => sum + i.cost * i.qty, 0);
  const retailValue = items.reduce((sum, i) => sum + (i.price > 0 ? i.price * i.qty : 0), 0);
  return {
    count: items.length,
    salonCount: items.filter((i) => i.type === 'salon').length,
    retailCount: items.filter((i) => i.type === 'retail').length,
    criticalCount: critical.length,
    costValue,
    retailValue,
    criticalItems: critical.map((i) => ({ id: i.id, name: i.name, qty: i.qty, minQty: i.minQty })),
  };
}
