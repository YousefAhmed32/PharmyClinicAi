import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebouncedCallback } from '@/hooks/useCommon';
import { ordersAPI } from '@/api/services';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;

const STATUS_CONFIG = {
  pending:          { label:'بانتظار التأكيد',  badge:'badge-yellow', icon:'⏳' },
  reviewing:        { label:'جاري المراجعة',    badge:'badge-blue',   icon:'🔍' },
  confirmed:        { label:'تم التأكيد',       badge:'badge-blue',   icon:'✅' },
  processing:       { label:'جاري التجهيز',     badge:'badge-orange', icon:'📦' },
  ready_for_pickup: { label:'جاهز للاستلام',    badge:'badge-green',  icon:'🏪' },
  out_for_delivery: { label:'في الطريق',        badge:'badge-green',  icon:'🚚' },
  delivered:        { label:'تم التوصيل',       badge:'badge-green',  icon:'🎉' },
  cancelled:        { label:'ملغي',             badge:'badge-red',    icon:'❌' },
  rejected:         { label:'مرفوض',            badge:'badge-red',    icon:'🚫' },
  returned:         { label:'مرتجع',            badge:'badge-gray',   icon:'↩️' },
  refunded:         { label:'تم الاسترداد',     badge:'badge-gray',   icon:'💰' },
};

const TRANSITIONS = {
  pending:          ['reviewing','confirmed','cancelled','rejected'],
  reviewing:        ['confirmed','cancelled','rejected'],
  confirmed:        ['processing','cancelled','rejected'],
  processing:       ['ready_for_pickup','out_for_delivery','cancelled'],
  ready_for_pickup: ['delivered','cancelled'],
  out_for_delivery: ['delivered','cancelled'],
  delivered:        ['returned'],
  cancelled:[], rejected:[], returned:['refunded'], refunded:[],
};

const PAYMENT_COLORS = { pending:'badge-yellow', paid:'badge-green', failed:'badge-red', refunded:'badge-gray' };

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label:status, badge:'badge-gray', icon:'•' };
  return <span className={`${cfg.badge} flex items-center gap-1 text-xs`}>{cfg.icon} {cfg.label}</span>;
}

function OrderDetailModal({ order, onClose, onStatusUpdate, isUpdating }) {
  const [newStatus, setNewStatus] = useState('');
  const [note,      setNote]      = useState('');
  const navigate = useNavigate();
  const allowed  = TRANSITIONS[order.status] || [];
  const needsNote= ['rejected','cancelled','returned'].includes(newStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose}/>
      <div className="relative z-50 bg-white rounded-2xl shadow-lifted w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-semibold text-lg">تفاصيل الطلب</h2>
            <span className="font-mono text-primary-700 text-sm font-bold">{order.orderNumber}</span>
            <StatusBadge status={order.status}/>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/admin/orders/${order._id}/invoice`)}
              className="btn-secondary btn-sm flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              طباعة الفاتورة
            </button>
            <button onClick={onClose} className="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-neutral-50 rounded-xl p-4">
              <p className="text-xs text-neutral-400 font-medium mb-2">العميل</p>
              <p className="font-semibold">{order.user?.name}</p>
              <p className="text-sm text-neutral-500">{order.user?.email}</p>
              <p className="text-sm text-neutral-500">{order.shippingAddress?.phone}</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4">
              <p className="text-xs text-neutral-400 font-medium mb-2">عنوان التوصيل</p>
              <p className="text-sm text-neutral-700">{order.shippingAddress?.street}</p>
              <p className="text-sm text-neutral-700">{order.shippingAddress?.city}، {order.shippingAddress?.state}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-neutral-50 rounded-xl text-sm">
            <span className="text-neutral-500">الدفع: <span className="font-medium capitalize">{order.paymentMethod?.replace(/_/g,' ')}</span></span>
            <span className={`ml-auto ${PAYMENT_COLORS[order.paymentStatus]||'badge-gray'}`}>{order.paymentStatus}</span>
          </div>

          {/* Items */}
          <div>
            <p className="text-sm font-semibold mb-2">المنتجات ({order.items?.length})</p>
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-neutral-100 rounded-xl">
                  <div className="w-10 h-10 bg-neutral-100 rounded-lg overflow-hidden shrink-0">
                    {item.image ?<img
  src={`${URL_IMAGE}/api/images/${item.image}`}
  alt={item.name}
  className="w-full h-full object-cover"
  onError={(e) => (e.target.src = "/placeholder.png")}
/> : <div className="w-full h-full flex items-center justify-center">💊</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-neutral-500">× {item.quantity} {item.unit||'قطعة'}</p>
                  </div>
                  <p className="font-semibold text-sm">{(item.price*item.quantity).toFixed(2)} EGP</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-neutral-50 rounded-xl p-4 space-y-1.5">
            {[['المجموع الفرعي', `${order.subtotal?.toFixed(2)} EGP`],
              ['الشحن', order.shippingCost===0?'مجاني':`${order.shippingCost?.toFixed(2)} EGP`],
              ...(order.discount>0?[['خصم', `-${order.discount?.toFixed(2)} EGP`]]:[]),
            ].map(([l,v]) => (
              <div key={l} className="flex justify-between text-sm text-neutral-600"><span>{l}</span><span>{v}</span></div>
            ))}
            <div className="flex justify-between font-bold border-t border-neutral-200 pt-2">
              <span>الإجمالي</span><span>{order.total?.toFixed(2)} EGP</span>
            </div>
          </div>

          {order.rejectionReason && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              <p className="text-xs text-red-500 font-medium mb-1">سبب الرفض</p>
              <p className="text-sm text-red-700">{order.rejectionReason}</p>
            </div>
          )}
          {order.returnReason && (
            <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
              <p className="text-xs text-yellow-600 font-medium mb-1">سبب الإرجاع</p>
              <p className="text-sm text-yellow-700">{order.returnReason}</p>
            </div>
          )}

          {/* History */}
          {order.statusHistory?.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">سجل الحالات</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...order.statusHistory].reverse().map((h, i) => {
                  const cfg = STATUS_CONFIG[h.status] || { icon:'•', label:h.status };
                  return (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span>{cfg.icon}</span>
                      <div>
                        <span className="font-medium text-neutral-700">{cfg.label}</span>
                        <span className="text-neutral-400 mx-1">·</span>
                        <span className="text-neutral-400">{h.changedAt ? format(new Date(h.changedAt),'dd MMM HH:mm') : ''}</span>
                        {h.note && <p className="text-neutral-500 mt-0.5">{h.note}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Update status */}
          {allowed.length > 0 && (
            <div className="border-t border-neutral-100 pt-4 space-y-3">
              <p className="text-sm font-semibold">تحديث الحالة</p>
              <select className="input text-sm" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                <option value="">اختر الحالة الجديدة…</option>
                {allowed.map(s => {
                  const cfg = STATUS_CONFIG[s] || { icon:'•', label:s };
                  return <option key={s} value={s}>{cfg.icon} {cfg.label}</option>;
                })}
              </select>
              <div>
                <label className="label">{needsNote ? <>السبب <span className="text-red-500">*</span></> : 'ملاحظة'}</label>
                <textarea className="input text-sm" rows={2} value={note} onChange={e => setNote(e.target.value)}
                  placeholder={needsNote ? 'اكتب السبب…' : 'ملاحظة داخلية (اختياري)…'}/>
              </div>
              <button disabled={!newStatus||isUpdating} onClick={() => {
                if (needsNote && !note.trim()) { toast.error('يرجى كتابة السبب'); return; }
                onStatusUpdate(order._id, newStatus, note);
              }} className="btn-primary w-full justify-center">
                {isUpdating ? 'جاري التحديث…' : 'تحديث الحالة'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [page,      setPage]      = useState(1);
  const [selected,  setSelected]  = useState(null);
  const [searchVal, setSearchVal] = useState('');
  const [filters,   setFilters]   = useState({ search:'', status:'', dateFrom:'', dateTo:'' });

  const debouncedSearch = useDebouncedCallback((val) => {
    setPage(1); setFilters(f => ({ ...f, search: val }));
  }, 400);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-orders', page, filters],
    queryFn: () => ordersAPI.getAll({ page, limit:12, ...filters }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin-orders-stats'],
    queryFn: () => ordersAPI.getStats().then(r => r.data.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, note }) => ordersAPI.updateStatus(id, { status, note }),
    onSuccess: (res) => {
      toast.success('تم تحديث الحالة ✓');
      qc.invalidateQueries(['admin-orders']);
      qc.invalidateQueries(['admin-orders-stats']);
      setSelected(res.data.data);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'فشل التحديث'),
  });

  const orders = data?.data || [];
  const meta   = data?.meta || {};
  const stats  = statsData;
  const hasFilters = filters.search || filters.status || filters.dateFrom || filters.dateTo;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">الطلبات</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{meta.total||0} إجمالي الطلبات</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {[
            { label:'الإجمالي',  val:stats.totalOrders,   icon:'📋', color:'bg-neutral-50' },
            { label:'نشطة',      val:stats.activeOrders||0,icon:'🔄', color:'bg-blue-50' },
            { label:'اليوم',     val:stats.todayOrders||0, icon:'📅', color:'bg-primary-50' },
            { label:'مرتجعات',  val:stats.returnedOrders||0,icon:'↩️',color:'bg-yellow-50' },
            { label:'الإيرادات',val:`${(stats.totalRevenue||0).toFixed(0)} EGP`, icon:'💰', color:'bg-green-50' },
          ].map(({ label, val, icon, color }) => (
            <div key={label} className={`card p-3 flex items-center gap-3 ${color}`}>
              <span className="text-lg">{icon}</span>
              <div><p className="font-bold text-sm">{val??'—'}</p><p className="text-xs text-neutral-500">{label}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 mb-5 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="input pl-9 text-sm" placeholder="بحث برقم الطلب أو اسم العميل…"
              value={searchVal} onChange={e => { setSearchVal(e.target.value); debouncedSearch(e.target.value); }}/>
          </div>
          <select className="input w-auto text-sm" value={filters.status}
            onChange={e => { setPage(1); setFilters(f => ({ ...f, status: e.target.value })); }}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.icon} {cfg.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <input type="date" className="input text-sm w-36" value={filters.dateFrom}
              onChange={e => { setPage(1); setFilters(f => ({ ...f, dateFrom: e.target.value })); }}/>
            <span className="text-neutral-400 text-xs">→</span>
            <input type="date" className="input text-sm w-36" value={filters.dateTo}
              onChange={e => { setPage(1); setFilters(f => ({ ...f, dateTo: e.target.value })); }}/>
          </div>
          {hasFilters && <button onClick={() => { setFilters({ search:'', status:'', dateFrom:'', dateTo:'' }); setSearchVal(''); setPage(1); }} className="btn-ghost btn-sm text-red-500">✕ مسح</button>}
        </div>
      </div>

      <div className={`card transition-opacity ${isFetching?'opacity-70':''}`}>
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(8)].map((_,i) => <div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center"><p className="text-4xl mb-3">📦</p><p className="text-neutral-500">لا توجد طلبات</p></div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="table">
              <thead>
                <tr><th>رقم الطلب</th><th>العميل</th><th>المنتجات</th><th>الإجمالي</th><th>الدفع</th><th>الحالة</th><th>التاريخ</th><th>الإجراءات</th></tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id}>
                    <td><p className="font-mono font-semibold text-sm text-primary-700">{order.orderNumber}</p>{order.invoiceNumber&&<p className="text-xs text-neutral-400 font-mono">{order.invoiceNumber}</p>}</td>
                    <td><p className="font-medium text-sm">{order.user?.name}</p><p className="text-xs text-neutral-400">{order.user?.email}</p></td>
                    <td className="text-sm text-neutral-600">{order.items?.length} منتج</td>
                    <td className="font-semibold text-sm">{order.total?.toFixed(2)} EGP</td>
                    <td><span className={`${PAYMENT_COLORS[order.paymentStatus]||'badge-gray'} text-xs`}>{order.paymentStatus}</span></td>
                    <td><StatusBadge status={order.status}/></td>
                    <td className="text-xs text-neutral-500">{format(new Date(order.createdAt),'dd MMM yyyy')}</td>
                    <td><button onClick={() => setSelected(order)} className="btn-secondary btn-sm">عرض</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">{((meta.page-1)*meta.limit)+1}–{Math.min(meta.page*meta.limit,meta.total)} من {meta.total}</p>
            <div className="flex gap-1">
              <button disabled={meta.page<=1} onClick={() => setPage(p=>p-1)} className="btn-ghost btn-sm disabled:opacity-40">← السابق</button>
              {[...Array(Math.min(meta.totalPages,7))].map((_,i) => (
                <button key={i+1} onClick={() => setPage(i+1)}
                  className={`w-8 h-8 rounded-lg text-sm ${meta.page===i+1?'bg-primary-600 text-white':'hover:bg-neutral-100'}`}>{i+1}</button>
              ))}
              <button disabled={meta.page>=meta.totalPages} onClick={() => setPage(p=>p+1)} className="btn-ghost btn-sm disabled:opacity-40">التالي →</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <OrderDetailModal order={selected} onClose={() => setSelected(null)}
          onStatusUpdate={(id, status, note) => updateStatus.mutate({ id, status, note })}
          isUpdating={updateStatus.isPending}/>
      )}
    </div>
  );
}
