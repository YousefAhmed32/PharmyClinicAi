import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReturnRequestModal from '@/components/ui/ReturnRequestModal';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersAPI } from '@/api/services';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;

const STATUS_CONFIG = {
  pending:          { label:'بانتظار التأكيد', color:'text-yellow-600 bg-yellow-50', icon:'⏳', step:0 },
  reviewing:        { label:'جاري المراجعة',   color:'text-blue-600 bg-blue-50',    icon:'🔍', step:1 },
  confirmed:        { label:'تم التأكيد',      color:'text-green-600 bg-green-50',  icon:'✅', step:2 },
  processing:       { label:'جاري التجهيز',    color:'text-blue-600 bg-blue-50',    icon:'📦', step:3 },
  ready_for_pickup: { label:'جاهز للاستلام',   color:'text-green-600 bg-green-50',  icon:'🏪', step:4 },
  out_for_delivery: { label:'في الطريق',       color:'text-orange-600 bg-orange-50',icon:'🚚', step:5 },
  delivered:        { label:'تم التوصيل',      color:'text-green-700 bg-green-50',  icon:'🎉', step:6 },
  cancelled:        { label:'ملغي',            color:'text-red-600 bg-red-50',      icon:'❌', step:-1 },
  rejected:         { label:'مرفوض',           color:'text-red-600 bg-red-50',      icon:'🚫', step:-1 },
  returned:         { label:'مرتجع',           color:'text-gray-600 bg-gray-50',    icon:'↩️', step:-1 },
  refunded:         { label:'تم الاسترداد',    color:'text-gray-600 bg-gray-50',    icon:'💰', step:-1 },
};

const PROGRESS_STEPS = ['pending','confirmed','processing','out_for_delivery','delivered'];

function OrderProgress({ status }) {
  if (['cancelled','rejected','returned','refunded'].includes(status)) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
        <span>{STATUS_CONFIG[status]?.icon}</span>
        <span className="text-sm font-medium text-red-700">{STATUS_CONFIG[status]?.label}</span>
      </div>
    );
  }

  const currentIdx = PROGRESS_STEPS.indexOf(status);

  return (
    <div className="flex items-center gap-1">
      {PROGRESS_STEPS.map((s, i) => {
        const cfg  = STATUS_CONFIG[s];
        const done = i <= currentIdx;
        return (
          <React.Fragment key={s}>
            <div className={`flex flex-col items-center ${i === 0 ? '' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${done ? 'bg-primary-600 text-white shadow-green' : 'bg-neutral-200 text-neutral-400'}`}>
                {done ? '✓' : i + 1}
              </div>
              <p className={`text-[10px] mt-1 text-center max-w-[60px] leading-tight
                ${done ? 'text-primary-700 font-semibold' : 'text-neutral-400'}`}>
                {cfg?.label}
              </p>
            </div>
            {i < PROGRESS_STEPS.length - 1 && (
              <div className={`flex-1 h-1 rounded-full mb-4 transition-all
                ${i < currentIdx ? 'bg-primary-600' : 'bg-neutral-200'}`}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const qc          = useQueryClient();
  const [showReturnModal, setShowReturnModal] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn:  () => ordersAPI.getMyOrder(id).then(r => r.data.data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersAPI.cancelMyOrder(id),
    onSuccess: () => {
      toast.success('تم إلغاء الطلب');
      qc.invalidateQueries(['order', id]);
      qc.invalidateQueries(['my-orders']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'فشل الإلغاء'),
  });

  const handleCancel = () => {
    if (window.confirm('هل أنت متأكد من إلغاء الطلب؟')) {
      cancelMutation.mutate();
    }
  };

  if (isLoading) return (
    <div className="section container-app max-w-3xl">
      <div className="space-y-4">{[...Array(4)].map((_,i) => (
        <div key={i} className="skeleton h-24 rounded-2xl"/>
      ))}</div>
    </div>
  );

  if (error || !order) return (
    <div className="section container-app text-center">
      <p className="text-4xl mb-3">❌</p>
      <p className="text-neutral-600">الطلب غير موجود</p>
      <Link to="/orders" className="btn-primary mt-4 inline-block">طلباتي</Link>
    </div>
  );

  const cfg        = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const cancellable= ['pending','reviewing','confirmed'].includes(order.status);

  return (
    <div className="section">
      <div className="container-app max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <button onClick={() => navigate('/orders')}
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-primary-600 mb-2 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              طلباتي
            </button>
            <h1 className="font-display text-2xl font-bold text-neutral-900 font-mono">
              {order.orderNumber}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {format(new Date(order.createdAt), 'dd MMMM yyyy — HH:mm', { locale: arSA })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
            <div className="flex gap-2">
              <Link to={`/orders/${id}/invoice`}
                className="btn-secondary btn-sm text-xs">📄 الفاتورة</Link>
              {cancellable && (
                <button onClick={handleCancel} disabled={cancelMutation.isPending}
                  className="btn-ghost btn-sm text-xs text-red-500 hover:bg-red-50">
                  {cancelMutation.isPending ? 'جاري…' : '❌ إلغاء'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="card p-5 mb-5">
          <h2 className="font-semibold text-neutral-800 mb-5">تتبع الطلب</h2>
          <OrderProgress status={order.status}/>
        </div>

        {/* Rejection/Return reason */}
        {(order.rejectionReason || order.returnReason || order.adminNotes) && (
          <div className="card p-4 mb-5 bg-red-50 border border-red-100">
            <p className="text-sm font-semibold text-red-700 mb-1">
              {order.rejectionReason ? '⚠️ سبب الرفض:' :
               order.returnReason    ? '↩️ سبب الإرجاع:' : '📝 ملاحظة:'}
            </p>
            <p className="text-sm text-red-600">
              {order.rejectionReason || order.returnReason || order.adminNotes}
            </p>
          </div>
        )}

        {/* Items */}
        <div className="card p-5 mb-5">
          <h2 className="font-semibold text-neutral-800 mb-4">
            المنتجات ({order.items?.length || 0})
          </h2>
          <div className="space-y-3">
            {order.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-neutral-100 last:border-0">
                <div className="w-14 h-14 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                  {item.image
                    ? <img
                    src={`${URL_IMAGE}/api/images/${item.image}`}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target.src = "/placeholder.png")}
                  />
                    : <div className="w-full h-full flex items-center justify-center text-xl">💊</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-800 truncate">{item.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {item.unitLabel || item.unit || 'قطعة'} · {item.price} EGP × {item.quantity}
                  </p>
                </div>
                <p className="font-bold text-neutral-900 shrink-0">
                  {(item.price * item.quantity).toFixed(2)} EGP
                </p>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-neutral-200 space-y-2">
            <div className="flex justify-between text-sm text-neutral-600">
              <span>المجموع الفرعي</span>
              <span>{order.subtotal?.toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between text-sm text-neutral-600">
              <span>الشحن</span>
              <span>{order.shippingCost === 0 ? 'مجاني 🎉' : `${order.shippingCost?.toFixed(2)} EGP`}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-primary-600">
                <span>خصم</span>
                <span>-{order.discount?.toFixed(2)} EGP</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-neutral-900 border-t border-neutral-200 pt-2 mt-1">
              <span>الإجمالي</span>
              <span>{order.total?.toFixed(2)} EGP</span>
            </div>
          </div>
        </div>

        {/* Shipping info */}
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div className="card p-5">
            <h2 className="font-semibold text-neutral-800 mb-3">عنوان الشحن</h2>
            <p className="text-sm text-neutral-700 font-medium">{order.shippingAddress?.fullName}</p>
            <p className="text-sm text-neutral-600">{order.shippingAddress?.phone}</p>
            <p className="text-sm text-neutral-600 mt-1">
              {order.shippingAddress?.street}، {order.shippingAddress?.city}
              {order.shippingAddress?.state ? `، ${order.shippingAddress.state}` : ''}
            </p>
            <p className="text-sm text-neutral-500">{order.shippingAddress?.country}</p>
          </div>
          <div className="card p-5">
            <h2 className="font-semibold text-neutral-800 mb-3">معلومات الدفع</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">طريقة الدفع</span>
                <span className="font-medium capitalize">
                  {order.paymentMethod?.replace(/_/g,' ')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">حالة الدفع</span>
                <span className={`font-medium ${
                  order.paymentStatus === 'paid'     ? 'text-green-600' :
                  order.paymentStatus === 'refunded' ? 'text-blue-600' :
                  order.paymentStatus === 'failed'   ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {order.paymentStatus === 'pending'  ? '⏳ معلق' :
                   order.paymentStatus === 'paid'     ? '✅ مدفوع' :
                   order.paymentStatus === 'refunded' ? '💰 مسترد' : '❌ فشل'}
                </span>
              </div>
            </div>
          </div>
          </div>

{order.statusHistory?.length > 0 && (
  <div className="card p-5">
    <h2 className="font-semibold text-neutral-800 mb-4">سجل الحالات</h2>
    <div className="space-y-3">
      {[...order.statusHistory].reverse().map((h, i) => {
        const hcfg = STATUS_CONFIG[h.status];
        return (
          <div key={i} className="flex items-start gap-3">
            <span className="text-lg shrink-0">{hcfg?.icon || '•'}</span>
            <div>
              <p className="text-sm font-semibold text-neutral-800">
                {hcfg?.label || h.status}
              </p>
              {h.note && (
                <p className="text-xs text-neutral-500">{h.note}</p>
              )}
              <p className="text-xs text-neutral-400 mt-0.5">
                {h.changedAt
                  ? format(new Date(h.changedAt), 'dd/MM/yyyy HH:mm')
                  : ''}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}

</div>

{/* ✅ المودال هنا في المكان الصح */}
{showReturnModal && order && (
<ReturnRequestModal
  order={order}
  onClose={() => setShowReturnModal(false)}
/>
)}

</div>
);}