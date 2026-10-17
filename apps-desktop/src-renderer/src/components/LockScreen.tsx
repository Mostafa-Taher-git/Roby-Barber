// Phase 5 — lock / activation screen. Shown full-screen when the license is locked or the trial ended,
// and as an overlay ("فعّل الآن") while the trial is running.
import { useState } from 'react';
import type { LicenseState, RobyApi, Salon } from '../api';

const REASON_TEXT: Record<NonNullable<LicenseState['reason']>, string> = {
  'trial-expired': 'انتهت الفترة التجريبية (7 أيام). أدخل مفتاح التفعيل لإكمال استخدام البرنامج مدى الحياة.',
  'clock-rollback': 'تم اكتشاف تغيير غير طبيعي في تاريخ/ساعة الجهاز، وتم إيقاف النسخة حمايةً للترخيص.',
  'transferred': 'هذه النسخة منسوخة من جهاز آخر — كل جهاز يحتاج مفتاح التفعيل الخاص به.',
  'key-invalid': 'تعذر التحقق من الترخيص المخزَّن. أدخل المفتاح مرة أخرى.',
  'blocked': 'هذا الجهاز موقوف من الإدارة. تواصل مع الدعم.',
};

function statusTitle(state: LicenseState): string {
  if (state.status === 'trial') return `النسخة التجريبية — باقي ${state.daysLeft} أيام`;
  if (state.status === 'expired') return 'انتهت الفترة التجريبية';
  return 'النسخة غير مفعّلة على هذا الجهاز';
}

export function LockScreen({ api, state, salon, onActivated, onClose }: {
  api: RobyApi;
  state: LicenseState;
  salon?: Salon | null;
  onActivated: (s: LicenseState) => void;
  onClose?: () => void;
}) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const waText = encodeURIComponent(`سلام عليكم كابتن روبي 👋\nعايز أفعّل برنامج إدارة الصالون.\nرقم الجهاز (MID): ${state.mid}`);
  const hasContact = state.ownerWhatsApp.length > 0;
  const waUrl = `https://wa.me/${state.ownerWhatsApp}?text=${waText}`;

  const copyMid = async () => {
    try {
      await navigator.clipboard.writeText(state.mid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('تعذر النسخ — انسخ الرقم يدوياً من فضلك');
    }
  };

  const activate = async () => {
    if (!key.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const next = await api.activate(key.trim());
      onActivated(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const card = (
    <div className="lock-card">
      <div className="lock-head">
        {salon?.logoDataUrl
          ? <img className="lock-logo" src={salon.logoDataUrl} alt="شعار الصالون" />
          : <span className="lock-logo-fallback">✂️</span>}
        <div>
          <b className="lock-title">{salon?.nameAr ?? 'روبي باربر'}</b>
          <div className="lock-sub">Roby Barber — نظام إدارة الصالون</div>
        </div>
      </div>

      <p className={`lock-status ${state.status === 'trial' ? 'ok' : 'warn'}`}>{statusTitle(state)}</p>
      {state.reason && <p className="lock-reason">{REASON_TEXT[state.reason]}</p>}

      <div className="mid-box">
        <span className="muted">رقم هذا الجهاز (أرسله لتفعيل النسخة)</span>
        <b className="mid-code" dir="ltr">{state.mid}</b>
        <div className="mid-actions">
          <button className="btn btn-ghost btn-sm" onClick={copyMid}>{copied ? 'تم النسخ ✓' : 'نسخ الرقم'}</button>
          {hasContact && (
            <a className="btn btn-primary btn-sm" href={waUrl} target="_blank" rel="noreferrer">
              إرسال الرقم على واتساب
            </a>
          )}
        </div>
        {hasContact
          ? <span className="muted" style={{ fontSize: '0.78rem' }}>سيتم الإرسال إلى واتساب: <b dir="ltr">{state.ownerWhatsApp}</b></span>
          : <span className="lock-reason" style={{ fontSize: '0.82rem' }}>⚠️ رقم واتساب التفعيل غير مضبوط — اضبطه من «الإعدادات ← التفعيل والدعم» قبل انتهاء الفترة التجريبية، أو انسخ رقم الجهاز وأرسله بنفسك.</span>}
      </div>

      <label className="lock-key-label">مفتاح التفعيل
        <textarea
          dir="ltr"
          rows={3}
          placeholder="الصق مفتاح التفعيل هنا (RB1-…)"
          value={key}
          onChange={(e) => { setKey(e.target.value); setError(''); }}
        />
      </label>
      {error && <p className="lock-err">⚠️ {error}</p>}

      <div className="mid-actions">
        {onClose && <button className="btn btn-ghost" onClick={onClose}>لاحقاً</button>}
        <button className="btn btn-primary" disabled={!key.trim() || busy} onClick={activate}>
          {busy ? 'جارٍ التحقق…' : 'تفعيل النسخة مدى الحياة'}
        </button>
      </div>

      <p className="lock-foot">
        التفعيل يتم بدون إنترنت — المفتاح صادر خصيصاً لهذا الجهاز ولا يعمل على غيره.
      </p>
    </div>
  );

  if (onClose) {
    return (
      <div className="overlay" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}>{card}</div>
      </div>
    );
  }
  return <div className="lock-screen">{card}</div>;
}
