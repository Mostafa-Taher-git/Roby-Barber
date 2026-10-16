import { useApi } from './useApi';
import { useCallback, useEffect, useState } from 'react';
import type { Appt, Chair, Customer, Offer, Salon, Service, StaffMember } from './api';
import { Icon, type IconName } from './Icon';
import { ToastHost, useToast } from './components/Toast';
import { PosPage, type PosPrefill } from './pages/PosPage';
import { CashboxPage } from './pages/CashboxPage';
import { SettingsPage } from './pages/SettingsPage';
import { egp } from './format';

type Filter = 'all' | 'waiting' | 'in_chair' | 'done';
type Page = 'overview' | 'chairs' | 'pos' | 'cashbox' | 'customers' | 'settings';

const NAV: { key: Page; label: string; icon: IconName }[] = [
  { key: 'overview', label: 'نظرة عامة', icon: 'home' },
  { key: 'chairs', label: 'الكراسي والحجوزات', icon: 'chair' },
  { key: 'pos', label: 'الكاشير (خدمات)', icon: 'receipt' },
  { key: 'cashbox', label: 'الخزينة والحسابات', icon: 'wallet' },
  { key: 'customers', label: 'الزبائن', icon: 'users' },
  { key: 'settings', label: 'الإعدادات', icon: 'settings' },
];

const STATUS: Record<Appt['status'], string> = {
  waiting: '⏳ في الانتظار',
  in_chair: '✂️ على الكرسي',
  done: '✅ تم الحساب',
};

export default function App() {
  const api = useApi();
  const { toasts, toast } = useToast();
  const [page, setPage] = useState<Page>('overview');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [booking, setBooking] = useState<boolean>(false);
  const [prefill, setPrefill] = useState<PosPrefill | null>(null);
  const [salon, setSalon] = useState<Salon | null>(null);

  const [appts, setAppts] = useState<Appt[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stats, setStats] = useState({ todaySales: 0, appointments: 0, waiting: 0, criticalStock: 0, staff: 0 });
  const [feed, setFeed] = useState<{ text: string; time: string }[]>([]);

  const refresh = useCallback(async () => {
    const [s, a, c, f, o] = await Promise.all([
      api.overview(), api.appointments('all'), api.chairs(), api.activity(), api.offers(true),
    ]);
    setStats(s); setAppts(a); setChairs(c); setFeed(f); setOffers(o);
  }, [api]);

  const reloadServices = useCallback(async () => {
    setServices(await api.services());
  }, [api]);

  const searchCustomers = useCallback(async (q: string) => {
    setCustomers(await api.customers(q));
  }, [api]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [svc, st, sl] = await Promise.all([api.services(), api.staff(), api.salon()]);
        if (!alive) return;
        setServices(svc);
        setStaff(st);
        setSalon(sl);
        await refresh();
        await searchCustomers('');
        if (alive) setReady(true);
      } catch (e) {
        if (alive) toast('error', `فشل تحميل البيانات: ${(e as Error).message}`);
      }
    })();
    return () => { alive = false; };
  }, [api, refresh, searchCustomers, toast]);

  const seat = async (id: string) => {
    try { await api.seatBooking(id); } catch (e) { toast('error', (e as Error).message); }
    refresh();
  };
  const finish = async (id: number) => {
    try { await api.finishChair(id); } catch (e) { toast('error', (e as Error).message); }
    refresh();
  };
  const callNext = async () => {
    try { await api.callNext(); } catch (e) { toast('error', (e as Error).message); }
    refresh();
  };
  const collect = (a: Appt) => {
    setPrefill({ bookingId: a.id, name: a.name, service: a.service, price: a.price });
    setPage('pos');
  };

  const waiting = appts.filter((a) => a.status === 'waiting');
  const visible = appts.filter((a) => filter === 'all' || a.status === filter);

  return (
    <div data-theme={theme}>
      <header className="topbar">
        <div className="brand">
          {salon?.logoDataUrl
            ? <img className="logo" src={salon.logoDataUrl} alt="شعار الصالون" />
            : <span className="logo-fallback">✂️</span>}
          <div>
            <b>{salon?.nameAr ?? 'صالون روبي باربر'}</b>
            <div className="brand-sub">Roby Barber — إدارة الصالون</div>
          </div>
          {ready
            ? <span className="badge ok">قاعدة البيانات متصلة ✓</span>
            : <span className="badge warn">تحميل…</span>}
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setBooking(true)}>
            <Icon name="plus" /> حجز زبون جديد
          </button>
          <button className="btn btn-ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'فاتح ☀️' : 'غامق 🌙'}
          </button>
        </div>
      </header>

      <div className="shell">
        <nav className="sidenav">
          {NAV.map((n) => (
            <button key={n.key} className={page === n.key ? 'active' : ''} onClick={() => setPage(n.key)}>
              <Icon name={n.icon} /> <span>{n.label}</span>
              {n.key === 'chairs' && waiting.length > 0 && <span className="nav-count">{waiting.length}</span>}
            </button>
          ))}
        </nav>

        <main className="main">
          {page === 'overview' && (
            <>
              <div className="card grid4">
                <Stat b={egp(stats.todaySales)} s="مبيعات اليوم" gold />
                <Stat b={`${stats.appointments}`} s={`حجز — ${stats.waiting} في الانتظار`} />
                <Stat b={`${stats.criticalStock}`} s="أصناف نواقص" danger={stats.criticalStock > 0} />
                <Stat b={`${stats.staff}`} s="أسطوات حاضرون" gold />
              </div>
              <div className="grid2">
                <div className="card">
                  <h3>سجل النشاط المباشر</h3>
                  {feed.length === 0 && <p className="empty">لا يوجد نشاط مسجل بعد</p>}
                  {feed.map((f, i) => (
                    <div key={i} className="feed"><span className="feed-dot" /><div><p>{f.text}</p><small>{f.time}</small></div></div>
                  ))}
                </div>
                <div className="card">
                  <h3>الكراسي الآن</h3>
                  <div className="chair-list">
                    {chairs.map((c) => (
                      <div key={c.id} className="row-between chair-row">
                        <span><b>كرسي {c.num}</b> <span className="muted">{c.status === 'busy' ? `${c.customer} — ${c.service}` : 'شاغر'}</span></span>
                        <span className={`badge ${c.status}`}>{c.status === 'busy' ? 'مشغول' : 'شاغر'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {offers.length > 0 && (
                <div className="card">
                  <h3>العروض الحالية</h3>
                  <div className="offers-row">
                    {offers.map((o) => (
                      <div className="offer-card" key={o.id}>
                        <b className="gold">{o.title}</b>
                        <span className="muted">{o.descAr}</span>
                        <span className="offer-price">{egp(o.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {page === 'chairs' && (
            <>
              <div className="card">
                <div className="row-between">
                  <h3>كراسي الحلاقة ({chairs.length})</h3>
                  <button className="btn btn-primary" onClick={callNext}><Icon name="bullhorn" /> نداء الزبون التالي</button>
                </div>
                <div className="chairs">
                  {chairs.map((c) => (
                    <div key={c.id} className={`chair ${c.status}`}>
                      <div className="row-between">
                        <b><Icon name="chair" /> كرسي {c.num}</b>
                        <span className={`badge ${c.status}`}>{c.status === 'busy' ? 'مشغول' : 'شاغر ومتاح'}</span>
                      </div>
                      <div className="chair-meta">
                        <div><Icon name="user" /> {c.status === 'busy' ? c.customer : 'الكرسي فاضي'}</div>
                        <div className="muted">{c.service}</div>
                        {c.status === 'busy' && <div className="gold">⏱ فاضل ~{c.remMins} دقيقة</div>}
                      </div>
                      {c.status === 'busy'
                        ? <button className="btn" onClick={() => finish(c.id)}><Icon name="check" /> إنهاء الجلسة</button>
                        : <span className="muted">جاهز لاستقبال الزبون التالي</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3>صالة الانتظار ({waiting.length})</h3>
                {waiting.length === 0 && <p className="empty">لا يوجد زبائن في الانتظار</p>}
                {waiting.map((w) => (
                  <div key={w.id} className="queue-row">
                    <div><b>{w.name}</b> <span className="muted">— {w.service} ({w.time})</span></div>
                    <button className="btn" onClick={() => seat(w.id)}><Icon name="chair" /> إجلاس على الكرسي</button>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="filter-tabs">
                  {(['all', 'waiting', 'in_chair', 'done'] as Filter[]).map((f) => (
                    <button key={f} className={`filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                      {f === 'all' ? 'الكل' : f === 'waiting' ? 'في الانتظار' : f === 'in_chair' ? 'على الكرسي' : 'تم الانتهاء'}
                    </button>
                  ))}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>كود الحجز</th><th>الزبون</th><th>الخدمة</th><th>الأسطى</th><th>الميعاد</th><th>الحالة</th><th>إجراء</th></tr></thead>
                    <tbody>
                      {visible.map((a) => (
                        <tr key={a.id}>
                          <td className="mono">{a.id}</td>
                          <td>{a.name}<br /><small className="muted" dir="ltr">{a.phone}</small></td>
                          <td>{a.service}</td>
                          <td>{a.barber}</td>
                          <td className="mono">{a.time}</td>
                          <td><span className={`badge ${a.status}`}>{STATUS[a.status]}</span></td>
                          <td>
                            {a.status === 'waiting' && <button className="btn btn-sm" onClick={() => seat(a.id)}>إجلاس</button>}
                            {a.status === 'in_chair' && <button className="btn btn-sm btn-primary" onClick={() => collect(a)}>تحصيل</button>}
                          </td>
                        </tr>
                      ))}
                      {visible.length === 0 && <tr><td colSpan={7} className="empty">لا توجد حجوزات</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {page === 'pos' && (
            <PosPage
              api={api} services={services} staff={staff}
              prefill={prefill} clearPrefill={() => setPrefill(null)}
              salon={salon} onChanged={refresh} toast={toast}
            />
          )}

          {page === 'cashbox' && (
            <CashboxPage api={api} salon={salon} toast={toast} onChanged={refresh} />
          )}

          {page === 'customers' && (
            <div className="card">
              <div className="row-between">
                <h3>قائمة الزبائن ({customers.length})</h3>
                <input className="search" placeholder="بحث بالاسم أو الموبايل…" value={search}
                  onChange={(e) => { setSearch(e.target.value); searchCustomers(e.target.value); }} />
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>الكود</th><th>الاسم</th><th>الموبايل</th><th>زيارات</th><th>نقاط الولاء</th><th>التصنيف</th><th>آخر حلاقة</th></tr></thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.code}>
                        <td className="mono">{c.code}</td>
                        <td>{c.name}</td>
                        <td className="mono" dir="ltr">{c.phone}</td>
                        <td>{c.visits}</td>
                        <td className="gold">{c.points}</td>
                        <td>{c.vip ? '👑 VIP' : 'زبون'}</td>
                        <td className="muted">{c.lastVisit}</td>
                      </tr>
                    ))}
                    {customers.length === 0 && <tr><td colSpan={7} className="empty">لا يوجد زبائن مطابقين</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {page === 'settings' && (
            <SettingsPage
              api={api} services={services} onServicesChanged={reloadServices}
              salon={salon} onSalonChange={setSalon} toast={toast}
            />
          )}
        </main>
      </div>

      {booking && (
        <NewBookingModal
          services={services}
          onClose={() => setBooking(false)}
          onSubmit={async (v) => {
            await api.createBooking({ ...v });
            setBooking(false);
            toast('success', 'تم تسجيل الحجز بنجاح');
            refresh();
          }}
        />
      )}

      <ToastHost toasts={toasts} />
    </div>
  );

  function Stat({ b, s, gold, danger }: { b: string; s: string; gold?: boolean; danger?: boolean }) {
    return <div className="stat"><b className={danger ? 'danger' : gold ? 'gold' : ''}>{b}</b><span>{s}</span></div>;
  }

  function NewBookingModal({ services, onClose, onSubmit }: {
    services: Service[];
    onClose: () => void;
    onSubmit: (v: { name: string; phone: string; service: string; barber: string; time: string; price: number; payment: string }) => void;
  }) {
    const [form, setForm] = useState({ name: '', phone: '', serviceId: services[0]?.id ?? '', barber: '', time: '', payment: 'كاش' });
    const svc = services.find((s) => s.id === form.serviceId);
    return (
      <div className="overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>حجز زبون جديد</h3>
          <label>اسم الزبون<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>رقم الموبايل<input required dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>الخدمة
            <select value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
              {services.map((s) => <option key={s.id} value={s.id}>{s.title} — {s.price} ج.م</option>)}
            </select>
          </label>
          <label>الأسطى<input value={form.barber} onChange={(e) => setForm({ ...form, barber: e.target.value })} placeholder="مثال: الأسطى أحمد خليل" /></label>
          <label>ميعاد الحضور<input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="04:00 م" /></label>
          <label>طريقة الدفع المتوقعة
            <select value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })}>
              <option>كاش</option><option>إنستاباي</option><option>فودافون كاش</option><option>فيزا</option>
            </select>
          </label>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
            <button className="btn btn-primary" disabled={!form.name.trim() || !form.phone.trim() || !svc}
              onClick={() => onSubmit({ name: form.name, phone: form.phone, service: svc!.title, barber: form.barber, time: form.time, price: svc!.price, payment: form.payment })}>
              حفظ الحجز
            </button>
          </div>
        </div>
      </div>
    );
  }
}
