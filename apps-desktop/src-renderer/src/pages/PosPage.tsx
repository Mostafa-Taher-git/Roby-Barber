// S3 — POS. Catalog + cart + payment picker + 80mm receipt. Money math shown = preview only;
// the authoritative numbers come back from main's checkout() (DESIGN doc §6).
import { useEffect, useMemo, useRef, useState } from 'react';
import { CAT_LABELS, PAY_LABELS, type CartLine, type PayMethod, type Receipt, type RobyApi, type Salon, type Service, type StaffMember } from '../api';
import { Receipt80 } from '../components/Receipt80';
import type { ToastKind } from '../components/Toast';
import { Icon } from '../Icon';
import { egp } from '../format';

export interface PosPrefill { bookingId: string; name: string; service: string; price: number; }

export function PosPage({ api, services, staff, prefill, clearPrefill, salon, onChanged, toast }: {
  api: RobyApi;
  services: Service[];
  staff: StaffMember[];
  prefill: PosPrefill | null;
  clearPrefill: () => void;
  salon: Salon | null;
  onChanged: () => void;
  toast: (kind: ToastKind, text: string) => void;
}) {
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState('');
  const [barber, setBarber] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [ref, setRef] = useState('');
  const [discount, setDiscount] = useState('');
  const [tip, setTip] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const bookingId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!prefill) return;
    const svc = services.find((s) => prefill.service.includes(s.title) || s.title.includes(prefill.service));
    setCart([{ id: svc?.id ?? `booking:${prefill.bookingId}`, title: prefill.service, price: prefill.price, qty: 1 }]);
    setCustomer(prefill.name);
    bookingId.current = prefill.bookingId;
    clearPrefill();
  }, [prefill, services, clearPrefill]);

  useEffect(() => { if (!barber && staff.length > 0) setBarber(staff[0].name); }, [staff, barber]);

  const cats = useMemo(() => {
    const present = new Set(services.map((s) => s.cat));
    return ['all', ...Object.keys(CAT_LABELS).filter((c) => present.has(c))];
  }, [services]);

  const visible = useMemo(() => services.filter((s) => {
    const okCat = cat === 'all' || s.cat === cat;
    const q = search.trim();
    const okSearch = !q || s.title.includes(q) || (s.desc ?? '').includes(q);
    return okCat && okSearch;
  }), [services, cat, search]);

  const add = (s: Service) => {
    setCart((prev) => {
      const found = prev.find((l) => l.id === s.id);
      if (found) return prev.map((l) => (l.id === s.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { id: s.id, title: s.title, price: s.price, qty: 1 }];
    });
  };
  const setQty = (id: string, qty: number) => {
    setCart((prev) => (qty < 1 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty } : l))));
  };

  const subtotal = cart.reduce((sum, l) => sum + l.price * l.qty, 0);
  const discountNum = Math.max(0, Math.round(Number(discount) || 0));
  const tipNum = Math.max(0, Math.round(Number(tip) || 0));
  const totalPreview = Math.max(0, subtotal - discountNum) + tipNum;
  const needsRef = payMethod !== 'cash';
  const canCheckout = cart.length > 0 && customer.trim().length > 0 && (!needsRef || ref.trim().length > 0) && !busy;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.checkout({
        items: cart.map(({ id, title, qty }) => ({ id, title, qty })),
        discount: discountNum, tip: tipNum,
        payMethod, ref: needsRef ? ref.trim() : undefined,
        barber, customer: customer.trim(),
        bookingId: bookingId.current,
      });
      setReceipt(r);
      setCart([]); setCustomer(''); setRef(''); setDiscount(''); setTip('');
      bookingId.current = undefined;
      onChanged();
      toast('success', `تم تحصيل ${egp(r.total)} — إيصال ${r.receiptNo}`);
    } catch (e) {
      toast('error', (e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="pos-layout">
      <div className="card pos-catalog">
        <div className="row-between">
          <h3>الخدمات والمنتجات</h3>
          <input className="search" placeholder="ابحث عن خدمة…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-tabs">
          {cats.map((c) => (
            <button key={c} className={`filter ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
              {c === 'all' ? 'الكل' : CAT_LABELS[c] ?? c}
            </button>
          ))}
        </div>
        <div className="svc-grid">
          {visible.map((s) => (
            <button key={s.id} className="svc-card" onClick={() => add(s)}>
              <span className="svc-title">{s.title}</span>
              <span className="svc-meta muted">{s.duration}{s.desc ? ` — ${s.desc}` : ''}</span>
              <span className="svc-price gold">{egp(s.price)}</span>
            </button>
          ))}
          {visible.length === 0 && <p className="empty">لا توجد خدمات مطابقة</p>}
        </div>
      </div>

      <div className="card pos-cart">
        <h3>الفاتورة ({cart.length})</h3>
        {cart.length === 0 && <p className="empty">اضغط على أي خدمة لإضافتها للفاتورة</p>}
        {cart.map((l) => (
          <div className="cart-row" key={l.id}>
            <div className="cart-info">
              <b>{l.title}</b>
              <small className="muted">{l.price} × {l.qty} = {egp(l.price * l.qty)}</small>
            </div>
            <div className="qty-stepper">
              <button className="btn btn-sm" onClick={() => setQty(l.id, l.qty + 1)}>+</button>
              <b>{l.qty}</b>
              <button className="btn btn-sm" onClick={() => setQty(l.id, l.qty - 1)}>−</button>
              <button className="btn btn-sm btn-danger-ghost" title="حذف" onClick={() => setQty(l.id, 0)}>✕</button>
            </div>
          </div>
        ))}

        <div className="pos-fields">
          <label>اسم الزبون<input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="زبون صالون مباشر" /></label>
          <label>الأسطى
            <select value={barber} onChange={(e) => setBarber(e.target.value)}>
              {staff.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </label>
          <div className="pos-two">
            <label>خصم (ج.م)<input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
            <label>إكرامية (ج.م)<input type="number" min={0} value={tip} onChange={(e) => setTip(e.target.value)} /></label>
          </div>
        </div>

        <div className="pay-picker">
          {(Object.keys(PAY_LABELS) as PayMethod[]).map((m) => (
            <button key={m} className={`pay-btn ${payMethod === m ? 'active' : ''}`} onClick={() => setPayMethod(m)}>
              {PAY_LABELS[m]}
            </button>
          ))}
        </div>
        {needsRef && (
          <label className="ref-field">رقم عملية التحويل (Ref#)
            <input dir="ltr" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="مثال: 5731829" />
          </label>
        )}

        <div className="cart-totals">
          <div className="row-between"><span className="muted">الإجمالي الفرعي</span><b>{egp(subtotal)}</b></div>
          <div className="row-between"><span className="muted">الخصم</span><b>-{egp(discountNum)}</b></div>
          <div className="row-between"><span className="muted">الإكرامية</span><b>+{egp(tipNum)}</b></div>
          <div className="row-between total-line"><span>الإجمالي</span><b className="gold">{egp(totalPreview)}</b></div>
          {discountNum > subtotal && <p className="error-text">⚠️ الخصم أكبر من الإجمالي</p>}
        </div>

        <button className="btn btn-primary btn-checkout" disabled={!canCheckout} onClick={submit}>
          <Icon name="receipt" /> {busy ? 'جارٍ التحصيل…' : 'حاسب واطبع'}
        </button>
      </div>

      {receipt && (
        <Receipt80 receipt={receipt} salon={salon} onClose={() => setReceipt(null)} onNewSale={() => setReceipt(null)} />
      )}
    </div>
  );
}
