// S5 — Staff & Payroll: roster cards, monthly payroll table, pay-slip print, advances, CRUD + photo.
import { useCallback, useEffect, useState } from 'react';
import type { PayrollItem, PayrollSummary, RobyApi, Salon, StaffInput } from '../api';
import { Icon } from '../Icon';
import { egp } from '../format';
import { PaySlip, monthLabel } from '../components/PaySlip';
import type { ToastKind } from '../components/Toast';

const curMonth = () => new Date().toISOString().slice(0, 7);
type ToastFn = (kind: ToastKind, text: string) => void;

export function StaffPage({ api, salon, toast }: { api: RobyApi; salon: Salon | null; toast: ToastFn }) {
  const [month, setMonth] = useState(curMonth());
  const [data, setData] = useState<PayrollSummary | null>(null);
  const [slip, setSlip] = useState<string | null>(null);
  const [advFor, setAdvFor] = useState<string | null>(null);
  const [editing, setEditing] = useState<PayrollItem | 'new' | null>(null);

  const load = useCallback(async () => {
    setData(await api.payroll(month));
  }, [api, month]);

  useEffect(() => {
    load().catch((e) => toast('error', (e as Error).message));
  }, [load, toast]);

  const items = data?.items ?? [];
  const totals = data?.totals;
  const slipItem = items.find((i) => i.staffId === slip) ?? null;
  const advItem = items.find((i) => i.staffId === advFor) ?? null;

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      await fn();
      toast('success', okMsg);
      await load();
    } catch (e) {
      toast('error', (e as Error).message);
    }
  };

  const pay = (item: PayrollItem) => {
    if (!window.confirm(`تأكيد صرف مستحقات ${item.nameAr} بمبلغ ${egp(item.net)} لشهر ${monthLabel(item.month)}؟`)) return;
    act(() => api.payStaff(item.staffId, month), `تم صرف مستحقات ${item.nameAr}`);
  };

  const remove = (item: PayrollItem) => {
    if (!window.confirm(`حذف ${item.nameAr} من الطاقم؟ (يبقى في التقارير القديمة)`)) return;
    act(() => api.deleteStaff(item.staffId), `تم حذف ${item.nameAr}`);
  };

  return (
    <>
      <div className="card">
        <div className="row-between">
          <h3>الطاقم والرواتب</h3>
          <div className="row-actions">
            <input className="search" type="month" value={month} max={curMonth()}
              onChange={(e) => setMonth(e.target.value || curMonth())} aria-label="شهر الرواتب" />
            <button className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" /> إضافة أسطى</button>
          </div>
        </div>
        {totals && (
          <div className="grid4" style={{ marginTop: 12 }}>
          <div className="stat"><b className="gold">{egp(totals.net)}</b><span>إجمالي المستحقات</span></div>
          <div className="stat"><b>{egp(totals.revenue)}</b><span>إيراد الخدمات الشهر</span></div>
          <div className="stat"><b>{egp(totals.commission)}</b><span>قيمة العمولات</span></div>
          <div className="stat"><b className={totals.advances > 0 ? 'danger' : ''}>{egp(totals.advances)}</b><span>السلف خلال الشهر</span></div>
          </div>
        )}
      </div>

      <div className="staff-grid">
        {items.map((s) => (
          <div className="staff-card" key={s.staffId}>
            <div className="staff-top">
              {s.photoDataUrl
                ? <img className="staff-photo" src={s.photoDataUrl} alt={s.nameAr} />
                : <span className="staff-photo fallback">{s.nameAr.trim().charAt(0)}</span>}
              <div>
                <b>{s.nameAr}</b>
                <div className="muted">{s.role}</div>
                <span className="badge in_chair">عمولة {s.commPct}%</span>
              </div>
            </div>
            <div className="staff-stats">
              <div><span className="muted">زبائن الشهر</span><b>{s.count}</b></div>
              <div><span className="muted">الراتب الأساسي</span><b>{egp(s.salary)}</b></div>
              <div><span className="muted">إيراد الخدمات</span><b>{egp(s.revenue)}</b></div>
              <div><span className="muted">المستحق الصافي</span><b className="gold">{egp(s.net)}</b></div>
            </div>
            <div className="staff-actions">
              <button className="btn btn-sm" onClick={() => setSlip(s.staffId)}>كشف حساب</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setAdvFor(s.staffId)} disabled={!!s.paid}>+ سلفة</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setEditing(s)}>تعديل</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="empty">لا يوجد أسطوات — أضف أول أسطى</p>}
      </div>

      <div className="card">
        <h3>مسير الرواتب — {data ? monthLabel(data.month) : ''}</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الأسطى</th><th>الزبائن</th><th>إيراد الخدمات</th><th>العمولة</th><th>قيمتها</th>
                <th>الإكراميات</th><th>السلف</th><th>الصافي</th><th>الحالة</th><th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.staffId}>
                  <td><b>{s.nameAr}</b><br /><small className="muted">{s.role}</small></td>
                  <td>{s.count}</td>
                  <td>{egp(s.revenue)}</td>
                  <td className="gold">{s.commPct}%</td>
                  <td>{egp(s.commission)}</td>
                  <td className="ok-text">{egp(s.tips)}</td>
                  <td className={s.advancesTotal > 0 ? 'danger' : 'muted'}>{s.advancesTotal > 0 ? `-${egp(s.advancesTotal)}` : '—'}</td>
                  <td><b className="gold">{egp(s.net)}</b></td>
                  <td>{s.paid ? <span className="badge done">مدفوع</span> : <span className="badge waiting">جاهز للصرف</span>}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm" onClick={() => setSlip(s.staffId)}>الكشف</button>
                      {!s.paid && <button className="btn btn-sm btn-primary" onClick={() => pay(s)}>صرف</button>}
                      <button className="btn btn-sm btn-ghost" onClick={() => remove(s)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={10} className="empty">لا يوجد بيانات</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {slipItem && (
        <PaySlip item={slipItem} salon={salon} onClose={() => setSlip(null)}
          onPay={() => { setSlip(null); pay(slipItem); }}
          onAddAdvance={() => { setSlip(null); setAdvFor(slipItem.staffId); }} />
      )}

      {advItem && (
        <AdvanceModal item={advItem} onClose={() => setAdvFor(null)}
          onDelete={(id) => act(() => api.deleteAdvance(id), 'تم حذف السلفة')}
          onSubmit={(amount, note) => act(async () => { await api.addAdvance(advItem.staffId, amount, note); setAdvFor(null); }, 'تم تسجيل السلفة')} />
      )}

      {editing && (
        <StaffModal item={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
          onSubmit={(input) => act(async () => { await api.saveStaff(input); setEditing(null); }, 'تم حفظ بيانات الأسطى')} />
      )}
    </>
  );
}

function AdvanceModal({ item, onClose, onSubmit, onDelete }: {
  item: PayrollItem;
  onClose: () => void;
  onSubmit: (amount: number, note: string) => void;
  onDelete: (id: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>سلفة — {item.nameAr} ({monthLabel(item.month)})</h3>
        {item.advancesList.length > 0 && (
          <div className="adv-list">
            {item.advancesList.map((a) => (
              <div className="row-between" key={a.id}>
                <span className="muted">{a.id} — {a.note}</span>
                <span><b className="danger">-{egp(a.amount)}</b>
                  <button className="btn btn-sm btn-ghost" onClick={() => onDelete(a.id)}>حذف</button></span>
              </div>
            ))}
          </div>
        )}
        <label>قيمة السلفة (ج.م)
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثال: 200" />
        </label>
        <label>السبب / ملاحظة
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="سلفة شخصية" />
        </label>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>إغلاق</button>
          <button className="btn btn-primary" disabled={!Number(amount) || Number(amount) <= 0}
            onClick={() => onSubmit(Math.round(Number(amount)), note)}>تسجيل السلفة</button>
        </div>
      </div>
    </div>
  );
}

function StaffModal({ item, onClose, onSubmit }: {
  item: PayrollItem | null;
  onClose: () => void;
  onSubmit: (input: StaffInput) => void;
}) {
  const [form, setForm] = useState({
    nameAr: item?.nameAr ?? '', role: item?.role ?? '', commPct: String(item?.commPct ?? 20),
    salary: String(item?.salary ?? 5000), photoDataUrl: null as string | null,
  });
  const [photoError, setPhotoError] = useState('');
  const preview = form.photoDataUrl ?? item?.photoDataUrl ?? null;

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setPhotoError('حجم الصورة أكبر من 2 ميجا'); return; }
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photoDataUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const valid = form.nameAr.trim() && Number(form.commPct) >= 0 && Number(form.commPct) <= 100 && Number(form.salary) >= 0;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{item ? `تعديل: ${item.nameAr}` : 'إضافة أسطى جديد'}</h3>
        <div className="staff-top">
          {preview
            ? <img className="staff-photo" src={preview} alt="صورة الأسطى" />
            : <span className="staff-photo fallback">✂️</span>}
          <label className="btn btn-sm upload-btn">
            اختيار صورة…
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </label>
          {photoError && <span className="danger">{photoError}</span>}
        </div>
        <label>اسم الأسطى *<input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="الأسطى محمد…" /></label>
        <label>الدور / التخصص<input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="كوافير محترف" /></label>
        <label>نسبة العمولة %<input inputMode="numeric" value={form.commPct} onChange={(e) => setForm({ ...form, commPct: e.target.value })} /></label>
        <label>الراتب الأساسي الشهري (ج.م)<input inputMode="numeric" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></label>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" disabled={!valid}
            onClick={() => onSubmit({ id: item?.staffId, nameAr: form.nameAr, role: form.role, commPct: Math.round(Number(form.commPct)), salary: Math.round(Number(form.salary)), photoDataUrl: form.photoDataUrl })}>
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
