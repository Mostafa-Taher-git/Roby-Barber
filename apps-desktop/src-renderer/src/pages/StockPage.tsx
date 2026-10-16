// S6 — Stock: KPI cards, filters, inventory table, restock (+10 quick like legacy), CRUD + low-stock alert.
import { useCallback, useEffect, useState } from 'react';
import type { RobyApi, StockInput, StockItem, StockPageData } from '../api';
import { Icon } from '../Icon';
import { egp } from '../format';
import type { ToastKind } from '../components/Toast';

type ToastFn = (kind: ToastKind, text: string) => void;
type Filter = 'all' | 'salon' | 'retail' | 'low';

const TYPE_LABELS: Record<string, string> = { salon: 'مستهلك صالون', retail: 'بيع مباشر للزبون' };

export function StockPage({ api, toast }: { api: RobyApi; toast: ToastFn }) {
  const [data, setData] = useState<StockPageData | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<StockItem | 'new' | null>(null);

  const load = useCallback(async () => {
    setData(await api.inventory());
  }, [api]);

  useEffect(() => {
    load().catch((e) => toast('error', (e as Error).message));
  }, [load, toast]);

  const levels = data?.levels;
  const items = (data?.items ?? []).filter((i) =>
    filter === 'all' ? true : filter === 'low' ? i.qty <= i.minQty : i.type === filter,
  );

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      await fn();
      toast('success', okMsg);
      await load();
    } catch (e) {
      toast('error', (e as Error).message);
    }
  };

  const quickRestock = (i: StockItem) => act(() => api.restock(i.id, 10), `تم توريد 10 قطع — ${i.name}`);

  const remove = (i: StockItem) => {
    if (!window.confirm(`حذف الصنف "${i.name}" من المخزن؟`)) return;
    act(() => api.deleteStock(i.id), 'تم حذف الصنف');
  };

  return (
    <>
      {levels && levels.criticalCount > 0 && (
        <div className="alert-danger">
          ⚠️ يوجد <b>{levels.criticalCount}</b> أصناف تحت حد الطلب — راجع النواقص واعمل توريد
        </div>
      )}

      {levels && (
        <div className="card grid4">
          <div className="stat"><b className={levels.criticalCount > 0 ? 'danger' : 'ok-text'}>{levels.criticalCount}</b><span>أصناف نواقص حرجة</span></div>
          <div className="stat"><b>{egp(levels.costValue)}</b><span>قيمة المخزون (تكلفة)</span></div>
          <div className="stat"><b className="gold">{egp(levels.retailValue)}</b><span>قيمة الرفوف للبيع</span></div>
          <div className="stat"><b>{levels.count}</b><span>إجمالي الأصناف ({levels.salonCount} صالون / {levels.retailCount} بيع)</span></div>
        </div>
      )}

      <div className="card">
        <div className="row-between">
          <h3>مخزن الصالون</h3>
          <button className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" /> إضافة صنف</button>
        </div>
        <div className="filter-tabs">
          {([['all', 'الكل'], ['salon', 'مستهلكات الصالون'], ['retail', 'منتجات بيع للزبائن'], ['low', 'النواقص فقط']] as [Filter, string][]).map(([f, label]) => (
            <button key={f} className={`filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {label}{f === 'low' && levels ? ` (${levels.criticalCount})` : ''}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>الصنف</th><th>النوع</th><th>التكلفة</th><th>سعر البيع</th><th>الكمية</th><th>حد الطلب</th><th>الحالة</th><th>إجراء</th></tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const critical = i.qty <= i.minQty;
                return (
                  <tr key={i.id}>
                    <td><b>{i.name}</b></td>
                    <td><span className="badge waiting">{TYPE_LABELS[i.type] ?? i.type}</span></td>
                    <td>{egp(i.cost)}</td>
                    <td>{i.price > 0 ? egp(i.price) : '—'}</td>
                    <td><b className={critical ? 'danger' : ''} style={{ fontSize: '1rem' }}>{i.qty}</b></td>
                    <td>{i.minQty}</td>
                    <td>{critical ? <span className="badge warn">⚠️ ناقص - حرج</span> : <span className="badge free">متوفر</span>}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm" onClick={() => quickRestock(i)}>+ توريد 10</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setEditing(i)}>تعديل</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => remove(i)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && <tr><td colSpan={8} className="empty">لا توجد أصناف مطابقة</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <StockModal item={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
          onSubmit={(input) => act(async () => { await api.saveStock(input); setEditing(null); }, 'تم حفظ الصنف')} />
      )}
    </>
  );
}

function StockModal({ item, onClose, onSubmit }: {
  item: StockItem | null;
  onClose: () => void;
  onSubmit: (input: StockInput) => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? '', type: item?.type ?? 'salon', cost: String(item?.cost ?? ''),
    price: String(item?.price ?? 0), qty: String(item?.qty ?? ''), minQty: String(item?.minQty ?? ''),
  });
  const num = (v: string) => Math.round(Number(v));
  const valid = form.name.trim() && Number(form.cost) >= 0 && Number(form.price) >= 0 && Number(form.qty) >= 0 && Number(form.minQty) >= 0;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{item ? `تعديل: ${item.name}` : 'إضافة صنف جديد'}</h3>
        <label>اسم الصنف *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>النوع
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="salon">مستهلك صالون (شغل يدوي)</option>
            <option value="retail">منتج بيع للزبون (رفوف)</option>
          </select>
        </label>
        <label>سعر التكلفة (ج.م)<input inputMode="numeric" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></label>
        <label>سعر البيع للزبون (0 لو مش للبيع)<input inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
        <label>الكمية الحالية<input inputMode="numeric" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></label>
        <label>حد الطلب (ينبهك لو الكمية وصلته)<input inputMode="numeric" value={form.minQty} onChange={(e) => setForm({ ...form, minQty: e.target.value })} /></label>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onSubmit({
              id: item?.id, name: form.name, type: form.type, cost: num(form.cost),
              price: num(form.price), qty: num(form.qty), minQty: num(form.minQty),
            })}>
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
