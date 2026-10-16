// S4 — Cashbox: live splits, expenses CRUD, Z-report close-shift (DESIGN doc §6/§7).
import { useCallback, useEffect, useState } from 'react';
import { PAY_LABELS, type Expense, type Financials, type PayMethod, type RobyApi, type Salon, type ZReport } from '../api';
import type { ToastKind } from '../components/Toast';
import { egp, arTime } from '../format';

const EXP_CATS = ['بوفيه وضيافة', 'نظافة ومطهرات', 'فواتير وكهرباء', 'أدوات ومستلزمات', 'تسويق وإعلانات', 'أخرى'];
const EXP_METHODS = ['كاش من الدرج', 'محفظة كاش', 'إنستاباي', 'فودافون كاش'];

const EMPTY_EXP = { title: '', amount: '', cat: EXP_CATS[0], person: '', method: EXP_METHODS[0] };

export function CashboxPage({ api, salon, toast, onChanged }: {
  api: RobyApi;
  salon: Salon | null;
  toast: (kind: ToastKind, text: string) => void;
  onChanged: () => void;
}) {
  const [fin, setFin] = useState<Financials | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<{ receiptNo: string; total: number; payMethod: PayMethod; at: string; customer: string; barber: string }[]>([]);
  const [form, setForm] = useState(EMPTY_EXP);
  const [modal, setModal] = useState<null | 'expense' | 'z'>(null);
  const [zActual, setZActual] = useState('');
  const [zResult, setZResult] = useState<ZReport | null>(null);

  const load = useCallback(async () => {
    const [f, e, s] = await Promise.all([api.financials(), api.expenses(), api.sales()]);
    setFin(f);
    setExpenses(e);
    const today = new Date().toISOString().slice(0, 10);
    setSales(s.filter((r) => r.at.slice(0, 10) === today));
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const addExpense = async () => {
    try {
      const row = await api.addExpense({
        title: form.title.trim(),
        amount: Number(form.amount),
        cat: form.cat, person: form.person.trim() || '-', method: form.method,
      });
      setModal(null); setForm(EMPTY_EXP);
      toast('success', `تم قيد مصروف ${row.no} بمبلغ ${egp(row.amount)}`);
      load(); onChanged();
    } catch (e) { toast('error', (e as Error).message); }
  };

  const removeExpense = async (no: string, title: string) => {
    if (!window.confirm(`حذف المصروف "${title}" (${no})؟`)) return;
    try {
      await api.deleteExpense(no);
      toast('success', 'تم حذف بند المصروف');
      load(); onChanged();
    } catch (e) { toast('error', (e as Error).message); }
  };

  const openZ = () => {
    if (!fin) return;
    setZActual(String(fin.expectedDrawer));
    setZResult(null);
    setModal('z');
  };

  const confirmZ = async () => {
    try {
      const report = await api.zReport(Number(zActual) || 0);
      setZResult(report);
      toast('success', 'تم تقفيل الوردية وحفظ تقرير Z بنجاح');
      load();
    } catch (e) { toast('error', (e as Error).message); }
  };

  const liveDiff = fin && zActual !== '' ? (Number(zActual) || 0) - fin.expectedDrawer : null;

  return (
    <>
      <div className="card grid3 stats-sm">
        <Stat b={egp(fin?.salesTotal ?? 0)} s={`إجمالي الإيراد — ${fin?.salesCount ?? 0} فاتورة`} gold />
        <Stat b={egp(fin?.cashSales ?? 0)} s="مقبوضات نقدية (درج)" />
        <Stat b={egp(fin?.onlineSales ?? 0)} s="مقبوضات إلكترونية (إنستاباي / محافظ / فيزا)" />
        <Stat b={egp(fin?.expensesTotal ?? 0)} s="إجمالي المصروفات" danger={(fin?.expensesTotal ?? 0) > 0} />
        <Stat b={egp(fin?.commissions ?? 0)} s="عمولات الأسطوات (20%)" />
        <Stat b={egp(fin?.netProfit ?? 0)} s="صافي الربح قبل المصروفات النقدية" gold={(fin?.netProfit ?? 0) > 0} danger={(fin?.netProfit ?? 0) < 0} />
      </div>

      <div className="card">
        <div className="row-between">
          <h3>فواتير اليوم ({sales.length})</h3>
          <div className="row-between">
            <button className="btn" onClick={() => setModal('expense')}>+ إضافة مصروف</button>
            <button className="btn btn-primary" onClick={openZ}>🔒 تقفيل الوردية (Z-Report)</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>الإيصال</th><th>الوقت</th><th>الزبون</th><th>الأسطى</th><th>طريقة الدفع</th><th>المبلغ</th></tr></thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.receiptNo}>
                  <td className="mono" dir="ltr">{s.receiptNo}</td>
                  <td className="muted">{arTime(s.at)}</td>
                  <td>{s.customer}</td>
                  <td>{s.barber}</td>
                  <td>{PAY_LABELS[s.payMethod] ?? s.payMethod}</td>
                  <td className="gold">{egp(s.total)}</td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan={6} className="empty">لا توجد فواتير اليوم — ابدأ من شاشة الكاشير</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>مصروفات اليوم ({expenses.length})</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>رقم</th><th>الوقت</th><th>البيان</th><th>التصنيف</th><th>المسؤول</th><th>الدفع</th><th>المبلغ</th><th></th></tr></thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.no}>
                  <td className="mono">{e.no}</td>
                  <td className="muted">{e.time}</td>
                  <td>{e.title}</td>
                  <td>{e.cat}</td>
                  <td>{e.person}</td>
                  <td>{e.method}</td>
                  <td className="danger">-{egp(e.amount)}</td>
                  <td><button className="btn btn-sm btn-danger-ghost" onClick={() => removeExpense(e.no, e.title)}>🗑</button></td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={8} className="empty">لا توجد مصروفات — أضف أول بند</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'expense' && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>إضافة مصروف جديد</h3>
            <label>البيان<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: كحول ومطهرات" /></label>
            <label>المبلغ (ج.م)<input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
            <label>التصنيف
              <select value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
                {EXP_CATS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>طريقة الدفع
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {EXP_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label>المسؤول<input value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} placeholder="كابتن روبي" /></label>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
              <button className="btn btn-primary" disabled={!form.title.trim() || !(Number(form.amount) > 0)} onClick={addExpense}>حفظ المصروف</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'z' && fin && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h3>تقفيل الوردية — Z-Report</h3>
            <div className="z-summary print-target">
              <div className="r-center r-salon">{salon?.nameAr ?? 'صالون روبي باربر'}</div>
              <div className="r-center r-small">{zResult?.shiftLabel ?? `وردية ${new Date().toLocaleDateString('ar-EG')}`}</div>
              <div className="r-dash" />
              <ZRow label="عدد الفواتير" value={`${fin.salesCount}`} />
              <ZRow label="إجمالي المبيعات" value={egp(fin.salesTotal)} strong />
              <ZRow label="مبيعات كاش" value={egp(fin.cashSales)} />
              <ZRow label="مبيعات إنستاباي" value={egp(fin.byMethod.instapay)} />
              <ZRow label="مبيعات فودافون كاش" value={egp(fin.byMethod.vodafone)} />
              <ZRow label="مبيعات فيزا" value={egp(fin.byMethod.visa)} />
              <div className="r-dash" />
              <ZRow label="إجمالي المصروفات" value={`-${egp(fin.expensesTotal)}`} />
              <ZRow label="منها مدفوع من الدرج" value={`-${egp(fin.cashExpenses)}`} />
              <ZRow label="عمولات الأسطوات (20%)" value={`-${egp(fin.commissions)}`} />
              <ZRow label="صافي الربح" value={egp(fin.netProfit)} strong />
              <div className="r-dash" />
              <ZRow label="النقدية المتوقعة بالدرج" value={egp(fin.expectedDrawer)} strong />
              {zResult ? (
                <>
                  <ZRow label="النقدية الفعلية المعدودة" value={egp(zResult.actualCash ?? 0)} />
                  <ZRow
                    label={((zResult.difference ?? 0) >= 0 ? 'زيادة (+) ' : 'عجز (−) ') + 'عن المتوقع'}
                    value={egp(Math.abs(zResult.difference ?? 0))}
                    strong
                  />
                </>
              ) : (
                <>
                  <label className="z-input">عد النقدية الفعلي في الدرج (ج.م)
                    <input type="number" value={zActual} onChange={(e) => setZActual(e.target.value)} />
                  </label>
                  {liveDiff !== null && (
                    <p className={liveDiff === 0 ? 'ok-text' : liveDiff > 0 ? 'gold' : 'error-text'}>
                      {liveDiff === 0 ? '✅ مطابق للمتوقع' : liveDiff > 0 ? `زيادة ${egp(liveDiff)}` : `عجز ${egp(Math.abs(liveDiff))}`}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="modal-actions no-print">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>إغلاق</button>
              {zResult
                ? <button className="btn" onClick={() => window.print()}>🖨️ طباعة التقرير</button>
                : <button className="btn btn-primary" onClick={confirmZ}>حفظ التقفيل</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );

  function Stat({ b, s, gold, danger }: { b: string; s: string; gold?: boolean; danger?: boolean }) {
    return <div className="stat"><b className={danger ? 'danger' : gold ? 'gold' : ''}>{b}</b><span>{s}</span></div>;
  }
}

function ZRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`z-row ${strong ? 'z-strong' : ''}`}>
      <span>{label}</span><b>{value}</b>
    </div>
  );
}
