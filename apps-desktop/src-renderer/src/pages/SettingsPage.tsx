// S8 — Settings: salon info, logo, pricing editor, offers, WhatsApp templates, backups (DESIGN doc §4/§6).
import { useEffect, useState } from 'react';
import { CAT_LABELS, type BackupInfo, type BackupStatus, type Offer, type RobyApi, type Salon, type Service, type Template } from '../api';
import type { ToastKind } from '../components/Toast';
import { egp } from '../format';

const LOGO_MAX = 2 * 1024 * 1024;

const TPL_LABELS: Record<string, string> = {
  ticket: 'تذكرة حجز (تأكيد الدور)',
  receipt: 'إيصال فاتورة (شكر بعد الدفع)',
  reminder: 'تذكير زبون (رجوع بعد فترة)',
  campaign: 'حملة تسويقية (عرض للجميع)',
};

export function SettingsPage({ api, services, onServicesChanged, salon, onSalonChange, toast }: {
  api: RobyApi;
  services: Service[];
  onServicesChanged: () => void;
  salon: Salon | null;
  onSalonChange: (s: Salon) => void;
  toast: (kind: ToastKind, text: string) => void;
}) {
  const [form, setForm] = useState({ nameAr: '', address: '', phone: '', instapay: '', vodafone: '' });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [newSvc, setNewSvc] = useState({ title: '', cat: 'hair', price: '', duration: '' });
  const [newOffer, setNewOffer] = useState({ title: '', descAr: '', price: '' });
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [backupList, setBackupList] = useState<BackupInfo[]>([]);
  const [backupBusy, setBackupBusy] = useState(false);
  const [contact, setContact] = useState('');
  const [contactSaved, setContactSaved] = useState('');

  useEffect(() => { api.backupStatus().then(setBackupStatus).catch(() => {}); }, [api]);
  useEffect(() => { api.licenseContact().then((r) => { setContact(r.phone); setContactSaved(r.phone); }).catch(() => {}); }, [api]);

  useEffect(() => {
    if (salon) setForm({ nameAr: salon.nameAr, address: salon.address, phone: salon.phone, instapay: salon.instapay, vodafone: salon.vodafone });
  }, [salon]);

  useEffect(() => { api.templates().then(setTemplates); }, [api]);
  useEffect(() => { api.offers().then(setOffers); }, [api]);

  const saveSalon = async () => {
    try {
      const saved = await api.saveSalon(form);
      onSalonChange(saved);
      toast('success', 'تم حفظ بيانات الصالون');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const uploadLogo = (file: File) => {
    if (file.size > LOGO_MAX) { toast('error', 'حجم الشعار أكبر من 2 ميجا'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const saved = await api.saveLogo(String(reader.result));
        if (salon) onSalonChange({ ...salon, logoPath: saved.logoPath, logoDataUrl: saved.logoDataUrl ?? String(reader.result) });
        toast('success', 'تم حفظ الشعار الجديد');
      } catch (e) { toast('error', (e as Error).message); }
    };
    reader.readAsDataURL(file);
  };

  const resetLogo = async () => {
    try {
      await api.resetLogo();
      if (salon) onSalonChange({ ...salon, logoPath: null, logoDataUrl: null });
      toast('success', 'تمت استعادة الشعار الافتراضي');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const saveSvc = async (s: Service) => {
    try {
      await api.saveService({ id: s.id, title: s.title, cat: s.cat, price: s.price, duration: s.duration, desc: s.desc });
      onServicesChanged();
      toast('success', `تم حفظ "${s.title}"`);
    } catch (e) { toast('error', (e as Error).message); }
  };

  const addSvc = async () => {
    try {
      await api.saveService({ title: newSvc.title.trim(), cat: newSvc.cat, price: Number(newSvc.price) || 0, duration: newSvc.duration.trim() || '-' });
      setNewSvc({ title: '', cat: 'hair', price: '', duration: '' });
      onServicesChanged();
      toast('success', 'تمت إضافة الخدمة');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const delSvc = async (s: Service) => {
    if (!window.confirm(`إخفاء خدمة "${s.title}" من الكاشير؟ (الفواتير القديمة لا تتأثر)`)) return;
    try {
      await api.deleteService(s.id);
      onServicesChanged();
      toast('success', 'تم حذف الخدمة');
    } catch (e) { toast('error', (e as Error).message); }
  };

  // Un-saved row edits live here; "حفظ" sends the merged row to the API.
  const [edits, setEdits] = useState<Record<string, Partial<Service>>>({});
  const patchSvc = (id: string, patch: Partial<Service>) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const merged = (s: Service): Service => ({ ...s, ...edits[s.id] });

  const saveTpl = async () => {
    try {
      const saved = await api.saveTemplates(templates.map((t) => ({ id: t.id, bodyAr: t.bodyAr })));
      setTemplates(saved);
      toast('success', 'تم حفظ قوالب الواتساب');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const saveOfferRow = async (o: Offer) => {
    try {
      const saved = await api.saveOffer({ id: o.id, title: o.title, descAr: o.descAr, price: o.price, active: o.active });
      setOffers((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
      toast('success', 'تم حفظ العرض');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const addOffer = async () => {
    try {
      const saved = await api.saveOffer({ title: newOffer.title.trim(), descAr: newOffer.descAr.trim(), price: Number(newOffer.price) || 0, active: 1 });
      setOffers((prev) => [...prev, saved]);
      setNewOffer({ title: '', descAr: '', price: '' });
      toast('success', 'تمت إضافة العرض');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const delOffer = async (id: string) => {
    if (!window.confirm('حذف هذا العرض؟')) return;
    try {
      await api.deleteOffer(id);
      setOffers((prev) => prev.filter((o) => o.id !== id));
      toast('success', 'تم حذف العرض');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const saveContact = async () => {
    try {
      const r = await api.saveLicenseContact(contact);
      setContact(r.phone);
      setContactSaved(r.phone);
      toast('success', r.phone ? 'تم حفظ رقم واتساب التفعيل' : 'تم مسح رقم واتساب التفعيل');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const refreshBackups = async () => {    try {
      const [status, list] = await Promise.all([api.backupStatus(), api.backupList()]);
      setBackupStatus(status);
      setBackupList(list.slice(0, 5));
    } catch (e) { toast('error', (e as Error).message); }
  };

  const backupNow = async () => {
    setBackupBusy(true);
    try {
      const info = await api.backupNow();
      toast('success', `تم إنشاء نسخة احتياطية (${Math.round(info.size / 1024)} ك.ب)`);
      await refreshBackups();
    } catch (e) { toast('error', (e as Error).message); }
    setBackupBusy(false);
  };

  const exportBackup = async () => {
    try {
      const res = await api.backupExport(backupStatus?.last?.path);
      if (res.ok) toast('success', `تم التصدير إلى ${res.path}`);
      else if (!res.canceled) toast('error', 'تعذر التصدير');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const importBackup = async () => {
    if (!window.confirm('استعادة نسخة احتياطية؟ سيتم إغلاق البرنامج وإعادة تشغيله بالبيانات المستعادة.')) return;
    try {
      const res = await api.backupImport();
      if (res.ok) toast('success', 'تمت الاستعادة — جارٍ إعادة التشغيل…');
      else if (res.error) toast('error', res.error);
    } catch (e) { toast('error', (e as Error).message); }
  };

  const restoreFile = async (f: BackupInfo) => {
    if (!window.confirm(`استعادة نسخة ${new Date(f.at).toLocaleString('ar-EG')}؟ سيتم إغلاق البرنامج وإعادة تشغيله.`)) return;
    try {
      const res = await api.restoreBackup(f.path);
      if (res.ok) toast('success', 'تمت الاستعادة — جارٍ إعادة التشغيل…');
      else if (res.error) toast('error', res.error);
    } catch (e) { toast('error', (e as Error).message); }
  };

  const lastBackupLabel = backupStatus?.last
    ? `${new Date(backupStatus.last.at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })} — ${Math.round(backupStatus.last.size / 1024)} ك.ب (${backupStatus.count} نسخة)`
    : 'لا توجد نسخ بعد';

  return (
    <>
      <div className="card">
        <h3>بيانات الصالون</h3>
        <div className="settings-grid">
          <label>اسم الصالون<input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></label>
          <label>العنوان<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <label>تليفون الصالون<input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" /></label>
          <label>رقم إنستاباي<input dir="ltr" value={form.instapay} onChange={(e) => setForm({ ...form, instapay: e.target.value })} /></label>
          <label>رقم فودافون كاش<input dir="ltr" value={form.vodafone} onChange={(e) => setForm({ ...form, vodafone: e.target.value })} /></label>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={saveSalon}>حفظ بيانات الصالون</button>
        </div>
      </div>

      <div className="card">
        <h3>التفعيل والدعم (واتساب)</h3>
        <p className="muted">الرقم الذي يُرسل إليه طلب التفعيل من شاشة القفل (رقم مسؤول البرنامج). يمكن تغييره في أي وقت، واتركه فارغاً لمسحه.</p>
        <div className="settings-grid">
          <label>رقم واتساب التفعيل
            <input dir="ltr" inputMode="tel" placeholder="01012345678" value={contact} onChange={(e) => setContact(e.target.value)} />
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" disabled={contact.trim() === contactSaved} onClick={saveContact}>حفظ الرقم</button>
          {contactSaved && <span className="muted">الرقم الحالي: <b dir="ltr">{contactSaved}</b></span>}
        </div>
      </div>

      <div className="card">
        <h3>شعار الصالون</h3>
        <div className="row-between logo-row">
          {salon?.logoDataUrl
            ? <img className="logo-preview" src={salon.logoDataUrl} alt="شعار الصالون" />
            : <span className="logo-fallback logo-preview">✂️</span>}
          <div className="row-between">
            <label className="btn">تغيير الشعار
              <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f);
                e.target.value = '';
              }} />
            </label>
            <button className="btn btn-ghost" onClick={resetLogo}>استعادة الافتراضي</button>
          </div>
          <span className="muted">PNG أو JPG — حتى 2 ميجا — يظهر في الهيدر والإيصالات</span>
        </div>
      </div>

      <div className="card">
        <h3>الأسعار والخدمات ({services.length})</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>الاسم</th><th>التصنيف</th><th>السعر (ج.م)</th><th>المدة</th><th></th></tr></thead>
            <tbody>
              {services.map((s) => {
                const m = merged(s);
                return (
                  <tr key={s.id}>
                    <td><input className="cell-input wide" value={m.title} onChange={(e) => patchSvc(s.id, { title: e.target.value })} /></td>
                    <td>
                      <select className="cell-input" value={m.cat} onChange={(e) => patchSvc(s.id, { cat: e.target.value })}>
                        {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td><input className="cell-input num" type="number" min={0} value={m.price} onChange={(e) => patchSvc(s.id, { price: Number(e.target.value) || 0 })} /></td>
                    <td><input className="cell-input" value={m.duration} onChange={(e) => patchSvc(s.id, { duration: e.target.value })} /></td>
                    <td className="row-between">
                      <button className="btn btn-sm" onClick={() => saveSvc(m)}>حفظ</button>
                      <button className="btn btn-sm btn-danger-ghost" onClick={() => delSvc(s)}>🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="settings-add row-between">
          <input className="cell-input wide" placeholder="خدمة جديدة…" value={newSvc.title} onChange={(e) => setNewSvc({ ...newSvc, title: e.target.value })} />
          <select className="cell-input" value={newSvc.cat} onChange={(e) => setNewSvc({ ...newSvc, cat: e.target.value })}>
            {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="cell-input num" type="number" placeholder="السعر" value={newSvc.price} onChange={(e) => setNewSvc({ ...newSvc, price: e.target.value })} />
          <input className="cell-input" placeholder="المدة" value={newSvc.duration} onChange={(e) => setNewSvc({ ...newSvc, duration: e.target.value })} />
          <button className="btn btn-primary" disabled={!newSvc.title.trim()} onClick={addSvc}>+ إضافة</button>
        </div>
      </div>

      <div className="card">
        <h3>العروض ({offers.length})</h3>
        {offers.map((o) => (
          <div className="offer-edit row-between" key={o.id}>
            <input className="cell-input wide" value={o.title} onChange={(e) => setOffers((prev) => prev.map((x) => (x.id === o.id ? { ...x, title: e.target.value } : x)))} />
            <input className="cell-input wide" value={o.descAr} onChange={(e) => setOffers((prev) => prev.map((x) => (x.id === o.id ? { ...x, descAr: e.target.value } : x)))} />
            <input className="cell-input num" type="number" min={0} value={o.price} onChange={(e) => setOffers((prev) => prev.map((x) => (x.id === o.id ? { ...x, price: Number(e.target.value) || 0 } : x)))} />
            <label className="switch-label">
              <input type="checkbox" checked={o.active === 1} onChange={(e) => setOffers((prev) => prev.map((x) => (x.id === o.id ? { ...x, active: e.target.checked ? 1 : 0 } : x)))} />
              نشط
            </label>
            <span className="gold">{egp(o.price)}</span>
            <button className="btn btn-sm" onClick={() => saveOfferRow(o)}>حفظ</button>
            <button className="btn btn-sm btn-danger-ghost" onClick={() => delOffer(o.id)}>🗑</button>
          </div>
        ))}
        {offers.length === 0 && <p className="empty">لا توجد عروض</p>}
        <div className="settings-add row-between">
          <input className="cell-input wide" placeholder="عنوان العرض" value={newOffer.title} onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })} />
          <input className="cell-input wide" placeholder="الوصف" value={newOffer.descAr} onChange={(e) => setNewOffer({ ...newOffer, descAr: e.target.value })} />
          <input className="cell-input num" type="number" placeholder="السعر" value={newOffer.price} onChange={(e) => setNewOffer({ ...newOffer, price: e.target.value })} />
          <button className="btn btn-primary" disabled={!newOffer.title.trim()} onClick={addOffer}>+ إضافة عرض</button>
        </div>
      </div>

      <div className="card">
        <h3>قوالب رسائل الواتساب</h3>
        <p className="muted tpl-hint">المتغيرات المتاحة: {'{name}'} {'{salon}'} {'{time}'} {'{receipt}'} {'{total}'} {'{points}'}</p>
        <div className="settings-grid">
          {templates.map((t) => (
            <label key={t.id}>{TPL_LABELS[t.kind] ?? t.kind}
              <textarea rows={3} value={t.bodyAr} onChange={(e) => setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, bodyAr: e.target.value } : x)))} />
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={saveTpl}>حفظ القوالب</button>
        </div>
      </div>

      <div className="card">
        <h3>النسخ الاحتياطي التلقائي</h3>
        <p className="muted">نسخة كل 10 دقائق تلقائياً أثناء العمل + نسخة عند غلق البرنامج — يحتفظ بآخر 24 ساعة + 30 يوماً.</p>
        <p className="row-between backup-status">
          <span>آخر نسخة: <b className="gold">{lastBackupLabel}</b></span>
          <button className="btn btn-sm btn-ghost" onClick={refreshBackups}>تحديث</button>
        </p>
        <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" disabled={backupBusy} onClick={backupNow}>
            {backupBusy ? 'جارٍ النسخ…' : 'نسخة احتياطية الآن'}
          </button>
          <button className="btn" onClick={exportBackup}>تصدير لفلاشة USB…</button>
          <button className="btn" onClick={importBackup}>استعادة من ملف…</button>
          <button className="btn btn-ghost" onClick={() => api.openBackupsFolder()}>فتح مجلد النسخ</button>
        </div>
        {backupList.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>النسخة</th><th>الحجم</th><th></th></tr></thead>
              <tbody>
                {backupList.map((f) => (
                  <tr key={f.name}>
                    <td className="mono">{new Date(f.at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>{Math.round(f.size / 1024)} ك.ب</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => restoreFile(f)}>استعادة</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => api.backupExport(f.path)}>تصدير</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
