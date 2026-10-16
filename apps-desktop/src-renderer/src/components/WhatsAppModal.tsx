// Phase 6 — WhatsApp send modal (customers page): reminder / campaign / custom text.
// The main process composes the final message from the editable templates and logs the click.
import { useState } from 'react';
import type { RobyApi, WaKind } from '../api';

const KINDS: { key: WaKind; label: string; hint: string }[] = [
  { key: 'reminder', label: 'تذكير بزيارة', hint: 'يستخدم نقاط الولاء واسم الزبون من القالب' },
  { key: 'campaign', label: 'عرض ترويجي', hint: 'نص الحملة من قالب الإعدادات' },
  { key: 'custom', label: 'رسالة مخصصة', hint: 'اكتب أي رسالة — {name} تتغير لاسم الزبون' },
];

export function WhatsAppModal({ api, name, phone, points, onClose, onSent, toast }: {
  api: RobyApi;
  name: string;
  phone: string;
  points: number;
  onClose: () => void;
  onSent: (url: string) => void;
  toast: (kind: 'success' | 'error', msg: string) => void;
}) {
  const [kind, setKind] = useState<WaKind>('reminder');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      const res = await api.waShare({
        kind, phone,
        vars: { name, points },
        text: kind === 'custom' ? text : undefined,
      });
      onSent(res.url);
      toast('success', `تم فتح واتساب — ${res.label}`);
      onClose();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>واتساب — {name}</h3>
        <p className="muted" dir="ltr" style={{ margin: 0 }}>{phone}</p>
        <div className="filter-tabs">
          {KINDS.map((k) => (
            <button key={k.key} className={`filter ${kind === k.key ? 'active' : ''}`} onClick={() => setKind(k.key)}>
              {k.label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{KINDS.find((k) => k.key === kind)?.hint}</p>
        {kind === 'custom' && (
          <label>نص الرسالة
            <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالتك…" />
          </label>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" disabled={busy || (kind === 'custom' && !text.trim())} onClick={send}>
            {busy ? 'جارٍ التحضير…' : 'فتح واتساب وإرسال'}
          </button>
        </div>
      </div>
    </div>
  );
}
