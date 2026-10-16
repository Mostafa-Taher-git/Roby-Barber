// Pay-slip (كشف حساب الأسطى) — prints on the same 80mm thermal path as receipts (`.print-target`).
import type { PayrollItem, Salon } from '../api';

export function monthLabel(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
}

export function PaySlip({ item, salon, onClose, onPay, onAddAdvance }: {
  item: PayrollItem;
  salon: Salon | null;
  onClose: () => void;
  onPay?: () => void;
  onAddAdvance?: () => void;
}) {
  const paidAt = item.paid ? new Date(item.paid.at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="receipt80 slip80 print-target">
          <div className="r-center r-salon">{salon?.nameAr ?? 'صالون روبي باربر'}</div>
          <div className="r-center r-small">كشف حساب مستحقات — {monthLabel(item.month)}</div>
          <div className="r-dash" />
          <div className="slip-head">
            {item.photoDataUrl
              ? <img className="staff-photo sm" src={item.photoDataUrl} alt={item.nameAr} />
              : <span className="staff-photo sm fallback">{item.nameAr.trim().charAt(0)}</span>}
            <div>
              <b>{item.nameAr}</b>
              <div className="r-small">{item.role}</div>
            </div>
          </div>
          <div className="r-dash" />
          <div className="r-row"><span>الراتب الأساسي الثابت</span><b>{item.salary} ج.م</b></div>
          <div className="r-row"><span>إيراد الخدمات المنفذة ({item.count} زبون)</span><b>{item.revenue} ج.م</b></div>
          <div className="r-row"><span>العمولة المستحقة ({item.commPct}%)</span><b className="gold">+{item.commission} ج.م</b></div>
          <div className="r-row"><span>إجمالي الإكراميات</span><b className="ok-text">+{item.tips} ج.م</b></div>
          <div className="r-row"><span>السلف والخصومات خلال الشهر</span><b className="danger">-{item.advancesTotal} ج.م</b></div>
          {item.advancesList.map((a) => (
            <div className="r-row r-small" key={a.id}>
              <span>سلفة {a.id} — {a.note}</span>
              <span>-{a.amount} ج.م</span>
            </div>
          ))}
          <div className="r-dash" />
          <div className="r-row r-total"><span>صافي المستحق للصرف</span><b>{item.net} ج.م</b></div>
          <div className="r-dash" />
          {item.paid
            ? <div className="r-center r-small">✅ تم الصرف بتاريخ {paidAt}</div>
            : <div className="r-center r-small">جاهز للصرف — يحتاج تأكيد الإدارة</div>}
        </div>
        <div className="modal-actions no-print">
          <button className="btn btn-ghost" onClick={onClose}>إغلاق</button>
          {onAddAdvance && !item.paid && <button className="btn" onClick={onAddAdvance}>+ سلفة</button>}
          <button className="btn" onClick={() => window.print()}>🖨️ طباعة الكشف</button>
          {onPay && !item.paid && <button className="btn btn-primary" onClick={onPay}>صرف المستحقات</button>}
        </div>
      </div>
    </div>
  );
}
