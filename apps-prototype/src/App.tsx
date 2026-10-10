import { useMemo, useState } from 'react';
import { appointments as seedAppts, calcTotal, chairs as seedChairs, services, type Appt } from './data/seed';

type Page = 'overview' | 'chairs' | 'pos';

export default function App() {
  const [page, setPage] = useState<Page>('overview');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [logo, setLogo] = useState<string | null>(null);
  const [appts, setAppts] = useState<Appt[]>(seedAppts);
  const [cart, setCart] = useState<string[]>(['srv_3']);
  const [tip, setTip] = useState(20);
  const [pay, setPay] = useState('كاش');
  const [receipt, setReceipt] = useState<string | null>(null);

  const cartItems = useMemo(() => cart.map((id) => services.find((s) => s.id === id)!).filter(Boolean), [cart]);
  const subtotal = cartItems.reduce((s, i) => s + i.price, 0);
  const total = calcTotal(subtotal, 0, tip);
  const waiting = appts.filter((a) => a.status === 'waiting');

  const seatNext = () => {
    const next = appts.find((a) => a.status === 'waiting');
    if (!next) return;
    setAppts((p) => p.map((a) => (a.id === next.id ? { ...a, status: 'in_chair' as const } : a)));
  };
  const checkout = () => {
    if (cart.length === 0) return;
    setReceipt(`RB-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  return (
    <div data-theme={theme}>
      <div className="topbar">
        <b>صالون روبي باربر {logo ? '🖼️' : ''} | Roby Barber — نموذج Phase 0</b>
        <div style={{ display: 'flex', gap: 8 }}>
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            تغيير اللوجو
            <input type="file" accept="image/*" hidden onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setLogo(URL.createObjectURL(f));
            }} />
          </label>
          <button className="btn btn-ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'وضع فاتح ☀️' : 'وضع غامق 🌙'}
          </button>
        </div>
      </div>
      <div className="shell">
        <nav className="sidenav">
          <button className={page === 'overview' ? 'active' : ''} onClick={() => setPage('overview')}>نظرة عامة</button>
          <button className={page === 'chairs' ? 'active' : ''} onClick={() => setPage('chairs')}>الكراسي والانتظار ({waiting.length})</button>
          <button className={page === 'pos' ? 'active' : ''} onClick={() => setPage('pos')}>الكاشير POS</button>
        </nav>
        <div className="main">
          {page === 'overview' && (
            <>
              <div className="card grid4">
                <div className="stat"><b>7,500 ج.م</b><span>مبيعات اليوم</span></div>
                <div className="stat"><b>{appts.length} حجوزات</b><span>منها {waiting.length} انتظار</span></div>
                <div className="stat"><b>3 نواقص</b><span>شفرات + سنفرة + فوط</span></div>
                <div className="stat"><b>8 أفراد</b><span>6 حلاقين + 2 مساعدين</span></div>
              </div>
              <div className="card">
                <h3>جدول الحجوزات (مباشر من الـ seed)</h3>
                <table><thead><tr><th>الكود</th><th>الزبون</th><th>الخدمة</th><th>الحالة</th></tr></thead>
                  <tbody>{appts.map((a) => (
                    <tr key={a.id}><td>{a.id}</td><td>{a.name}</td><td>{a.service}</td>
                      <td><span className={`badge ${a.status}`}>{a.status === 'waiting' ? 'انتظار' : a.status === 'in_chair' ? 'على الكرسي' : 'تم'}</span></td></tr>
                  ))}</tbody></table>
              </div>
            </>
          )}
          {page === 'chairs' && (
            <>
              <div className="card">
                <h3>حالة الكراسي (5)</h3>
                {seedChairs.map((c) => (
                  <div key={c.id} className={`chair ${c.status}`}>
                    <b>كرسي {c.num}</b> — {c.barber} <span className={`badge ${c.status}`}>{c.status === 'busy' ? 'مشغول' : 'شاغر'}</span>
                    <div style={{ color: 'var(--muted)' }}>{c.customer} • {c.service}{c.status === 'busy' ? ` • فاضل ${c.remMins} د` : ''}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3>صالة الانتظار ({waiting.length})</h3>
                {waiting.map((w) => <div key={w.id}>• {w.name} — {w.service} ({w.time})</div>)}
                <br /><button className="btn btn-primary" onClick={seatNext}>إجلاس التالي على الكرسي</button>
              </div>
            </>
          )}
          {page === 'pos' && (
            <div className="grid2">
              <div className="card">
                <h3>الخدمات (9) — اضغط للإضافة</h3>
                {services.map((s) => (
                  <button key={s.id} className="svc" onClick={() => setCart((c) => [...c, s.id])}>
                    {s.title} — <b>{s.price} ج.م</b> <span style={{ color: 'var(--muted)' }}>({s.duration})</span>
                  </button>
                ))}
              </div>
              <div className="card">
                <h3>البون الحالي</h3>
                {cartItems.length === 0 && <p>فارغ — اختر خدمة</p>}
                {cartItems.map((i, ix) => <div key={ix}>• {i.title} — {i.price} ج.م <button onClick={() => setCart((c) => c.filter((_, j) => j !== ix))}>حذف</button></div>)}
                <p>المجموع: {subtotal} | إكرامية: <input type="number" value={tip} onChange={(e) => setTip(Number(e.target.value))} style={{ width: 70 }} /> | <b>الإجمالي: {total} ج.م</b></p>
                <p>الدفع: <select value={pay} onChange={(e) => setPay(e.target.value)}>
                  <option>كاش</option><option>إنستاباي</option><option>فودافون كاش</option><option>فيزا</option>
                </select> {pay !== 'كاش' && <input placeholder="رقم المرجع Ref#" />}</p>
                <button className="btn btn-primary" onClick={checkout}>تأكيد وطباعة البون (80mm)</button>
                {receipt && <div style={{ marginTop: 12 }}><div className="receipt">
                  <b>ROBY BARBER</b><br />صالون روبي باربر<br />بون {receipt} — {pay}<br />
                  {cartItems.map((i, ix) => <div key={ix}>{i.title} … {i.price}</div>)}
                  <b>الإجمالي: {total} ج.م</b><br />نورتنا يا باشا!
                </div></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
