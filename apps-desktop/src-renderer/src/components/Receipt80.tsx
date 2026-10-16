// 80mm thermal receipt — 72mm printable width, pixel-exact to paper (DESIGN doc §3/§1.6).
// Printing: only `.print-target` is visible (@media print in index.css).
// Phase 6: optional WhatsApp resend (button hidden when the customer's phone is unknown).
import type { Receipt, Salon } from '../api';

export function Receipt80({ receipt, salon, onClose, onNewSale, onWhatsApp }: {
  receipt: Receipt;
  salon: Salon | null;
  onClose: () => void;
  onNewSale: () => void;
  onWhatsApp?: () => void;
}) {
  const at = new Date(receipt.at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="receipt80 print-target">
          <div className="r-center r-salon">{salon?.nameAr ?? 'صالون روبي باربر'}</div>
          <div className="r-center r-small">{salon?.address ?? ''}</div>
          <div className="r-center r-small" dir="ltr">{salon?.phone ?? ''}</div>
          <div className="r-dash" />
          <div className="r-row"><span>رقم الإيصال</span><b dir="ltr">#{receipt.receiptNo}</b></div>
          <div className="r-row"><span>التاريخ</span><b>{at}</b></div>
          <div className="r-row"><span>الزبون</span><b>{receipt.customer}</b></div>
          <div className="r-row"><span>الأسطى</span><b>{receipt.barber}</b></div>
          <div className="r-dash" />
          {receipt.items.map((it, i) => (
            <div className="r-row r-item" key={i}>
              <span>{it.title}</span>
              <span>{it.qty} × {it.price}</span>
              <b>{it.price * it.qty} ج.م</b>
            </div>
          ))}
          <div className="r-dash" />
          <div className="r-row"><span>الإجمالي الفرعي</span><b>{receipt.subtotal} ج.م</b></div>
          <div className="r-row"><span>الخصم</span><b>-{receipt.discount} ج.م</b></div>
          <div className="r-row"><span>الإكرامية</span><b>+{receipt.tip} ج.م</b></div>
          <div className="r-row r-total"><span>الإجمالي النهائي</span><b>{receipt.total} ج.م</b></div>
          <div className="r-dash" />
          <div className="r-row"><span>طريقة الدفع</span><b>{receipt.payLabel}</b></div>
          {receipt.ref && <div className="r-row"><span>رقم العملية</span><b dir="ltr">{receipt.ref}</b></div>}
          <div className="r-dash" />
          <div className="r-center r-small">شكراً لزيارتكم — نراكم قريباً ✂️</div>
          <div className="r-center r-qr">[ QR ]</div>
        </div>
        <div className="modal-actions no-print">
          <button className="btn btn-ghost" onClick={onClose}>إغلاق</button>
          {onWhatsApp && (
            <button className="btn btn-wa" onClick={onWhatsApp}>إرسال واتساب</button>
          )}
          <button className="btn" onClick={() => window.print()}>🖨️ طباعة الإيصال</button>
          <button className="btn btn-primary" onClick={onNewSale}>فاتورة جديدة</button>
        </div>
      </div>
    </div>
  );
}
