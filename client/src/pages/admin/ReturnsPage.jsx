import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { returnsAPI } from '@/api/services';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;


// ── Config ────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:            { label:'Pending',            badge:'badge-yellow', icon:'⏳' },
  partially_approved: { label:'Partially Approved', badge:'badge-orange', icon:'⚡' },
  approved:           { label:'Approved',           badge:'badge-green',  icon:'✅' },
  rejected:           { label:'Rejected',           badge:'badge-red',    icon:'❌' },
  received:           { label:'Received',           badge:'badge-blue',   icon:'📦' },
  refunded:           { label:'Refunded',           badge:'badge-gray',   icon:'💰' },
  closed:             { label:'Closed',             badge:'badge-gray',   icon:'🔒' },
};

const ITEM_STATUS_CFG = {
  pending:  { color:'bg-yellow-50 border-yellow-200 text-yellow-700', icon:'⏳', label:'Pending'  },
  approved: { color:'bg-primary-50 border-primary-200 text-primary-700', icon:'✅', label:'Approved' },
  rejected: { color:'bg-red-50 border-red-200 text-red-700',         icon:'❌', label:'Rejected' },
};

const REASON_LABELS = {
  wrong_product:'Wrong Product', damaged:'Damaged', expired:'Expired',
  not_as_described:'Not as Described', changed_mind:'Changed Mind', other:'Other',
};

// ── Item Decision Row ─────────────────────────────────────────────────────
function ItemDecisionRow({ item, returnId, onDecided }) {
  const qc  = useQueryClient();
  const [showForm,    setShowForm]    = useState(false);
  const [decision,    setDecision]    = useState('');
  const [adminNote,   setAdminNote]   = useState(item.adminNote || '');
  const [rejectReason,setRejectReason]= useState(item.rejectionReason || '');

  const iCfg = ITEM_STATUS_CFG[item.status] || ITEM_STATUS_CFG.pending;

  const decide = useMutation({
    mutationFn: () => returnsAPI.adminDecideItem(returnId, item._id, {
      decision,
      adminNote:       adminNote.trim()    || undefined,
      rejectionReason: decision === 'rejected' ? rejectReason.trim() : undefined,
    }),
    onSuccess: (res) => {
      toast.success(`Item ${decision} ✓`);
      qc.invalidateQueries(['admin-return', returnId]);
      qc.invalidateQueries(['admin-returns']);
      setShowForm(false);
      onDecided?.(res.data.data);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className={`rounded-xl border p-3 transition-all ${iCfg.color}`}>
      {/* Item header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/70 overflow-hidden shrink-0">
          {item.image
            ? <img src={`${URL_IMAGE}/api/images/${item.image}`} alt="" className="w-full h-full object-cover"/>
            : <div className="w-full h-full flex items-center justify-center">💊</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-xs opacity-70">
            Returning {item.returnedQty} of {item.orderedQty} ·
            {REASON_LABELS[item.reason] || item.reason}
          </p>
          {item.reasonDetails && (
            <p className="text-xs opacity-60 italic mt-0.5">"{item.reasonDetails}"</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-bold">{iCfg.icon} {iCfg.label}</p>
          <p className="text-xs font-semibold mt-0.5">
            {(item.price * item.returnedQty).toFixed(2)} EGP
          </p>
        </div>
      </div>

      {/* Admin note / rejection reason if already decided */}
      {item.status !== 'pending' && (
        <div className="mt-2 pt-2 border-t border-white/40 space-y-1">
          {item.adminNote && (
            <p className="text-xs opacity-80">📝 {item.adminNote}</p>
          )}
          {item.rejectionReason && (
            <p className="text-xs font-medium">❌ Reason: {item.rejectionReason}</p>
          )}
          {item.decidedAt && (
            <p className="text-xs opacity-60">
              {format(new Date(item.decidedAt), 'dd MMM yyyy HH:mm')}
            </p>
          )}
        </div>
      )}

      {/* Decision form for pending items */}
      {item.status === 'pending' && (
        <div className="mt-2 pt-2 border-t border-white/40">
          {!showForm ? (
            <div className="flex gap-2">
              <button
                onClick={() => { setDecision('approved'); setShowForm(true); }}
                className="flex-1 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg
                           hover:bg-primary-700 transition-colors">
                ✅ Approve
              </button>
              <button
                onClick={() => { setDecision('rejected'); setShowForm(true); }}
                className="flex-1 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg
                           hover:bg-red-600 transition-colors">
                ❌ Reject
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold">
                {decision === 'approved' ? '✅ Approving item' : '❌ Rejecting item'}
              </p>

              {decision === 'rejected' && (
                <input className="input text-xs py-1.5 bg-white/80 border-white"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Rejection reason (required) *"/>
              )}

              <input className="input text-xs py-1.5 bg-white/80 border-white"
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Admin note (optional)…"/>

              <div className="flex gap-2">
                <button
                  onClick={() => decide.mutate()}
                  disabled={
                    decide.isPending ||
                    (decision === 'rejected' && !rejectReason.trim())
                  }
                  className={`flex-1 py-1.5 text-white text-xs font-semibold rounded-lg
                    disabled:opacity-50 transition-colors
                    ${decision === 'approved' ? 'bg-primary-600 hover:bg-primary-700'
                      : 'bg-red-500 hover:bg-red-600'}`}>
                  {decide.isPending ? '...' : 'Confirm'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setDecision(''); }}
                  className="px-3 py-1.5 text-xs bg-white/60 rounded-lg hover:bg-white/80">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Return Detail Modal ───────────────────────────────────────────────────
function ReturnModal({ returnId, onClose }) {
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [adminNotes,   setAdminNotes]   = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [rejectReason, setRejectReason] = useState('');
  const [showBulk,     setShowBulk]     = useState(false);
  const [bulkDecision, setBulkDecision] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-return', returnId],
    queryFn:  () => returnsAPI.adminGet(returnId).then(r => r.data.data),
  });

  const ret = data;

  const bulkDecide = useMutation({
    mutationFn: () => returnsAPI.adminBulkDecide(returnId, {
      decision:        bulkDecision,
      adminNote:       adminNotes.trim() || undefined,
      rejectionReason: bulkDecision === 'rejected' ? rejectReason.trim() : undefined,
    }),
    onSuccess: (res) => {
      toast.success(`All items ${bulkDecision} ✓`);
      qc.invalidateQueries(['admin-return', returnId]);
      qc.invalidateQueries(['admin-returns']);
      setShowBulk(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const setStatus = useMutation({
    mutationFn: (status) => returnsAPI.adminSetStatus(returnId, {
      status,
      adminNotes: adminNotes.trim() || undefined,
      refundMethod: status === 'refunded' ? refundMethod : undefined,
    }),
    onSuccess: (res) => {
      toast.success(`Return marked as ${res.data.data.status} ✓`);
      qc.invalidateQueries(['admin-return', returnId]);
      qc.invalidateQueries(['admin-returns']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  if (isLoading || !ret) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose}/>
      <div className="relative z-50 bg-white rounded-2xl p-8 w-full max-w-2xl animate-scale-in">
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
      </div>
    </div>
  );

  const cfg          = STATUS_CFG[ret.status] || { label: ret.status, badge:'badge-gray', icon:'•' };
  const pendingCount = ret.items?.filter(i => i.status === 'pending').length || 0;
  const approvedAmt  = ret.items?.filter(i => i.status === 'approved')
    .reduce((s, i) => s + i.price * i.returnedQty, 0) || 0;

  const canReceive = ['approved','partially_approved'].includes(ret.status);
  const canRefund  = ret.status === 'received';
  const canClose   = ['approved','partially_approved','rejected','refunded'].includes(ret.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose}/>
      <div className="relative z-50 bg-white rounded-2xl shadow-lifted w-full max-w-2xl
                      max-h-[92vh] overflow-y-auto animate-scale-in">

        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono font-semibold text-lg">{ret.returnNumber}</h2>
                <span className={cfg.badge}>{cfg.icon} {cfg.label}</span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {format(new Date(ret.createdAt), 'dd MMM yyyy HH:mm')}
              </p>
            </div>
            <button onClick={onClose} className="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Summary strip */}
          <div className="flex flex-wrap gap-4 mt-3 text-xs">
            <span className="text-neutral-500">
              Patient: <strong className="text-neutral-700">{ret.patient?.name}</strong>
            </span>
            <span className="text-neutral-500">
              Order: <strong className="text-primary-700">{ret.order?.orderNumber}</strong>
            </span>
            <span className="text-neutral-500">
              Items: <strong>{ret.items?.length}</strong>
            </span>
            {approvedAmt > 0 && (
              <span className="text-primary-600 font-semibold">
                Approved refund: {approvedAmt.toFixed(2)} EGP
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Patient info */}
          <div className="bg-neutral-50 rounded-xl p-4 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-neutral-400 mb-1">Patient</p>
              <p className="font-semibold">{ret.patient?.name}</p>
              <p className="text-neutral-500 text-xs">{ret.patient?.email}</p>
              <p className="text-neutral-500 text-xs">{ret.patient?.phone}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 mb-1">Original Order</p>
              <p className="font-mono font-semibold text-primary-700">{ret.order?.orderNumber}</p>
              <p className="text-neutral-500 text-xs">
                Total: {ret.order?.total?.toFixed(2)} EGP
              </p>
              {ret.order?.createdAt && (
                <p className="text-neutral-500 text-xs">
                  {format(new Date(ret.order.createdAt), 'dd MMM yyyy')}
                </p>
              )}
            </div>
          </div>

          {/* Bulk actions for pending items */}
          {pendingCount > 0 && ['pending','partially_approved'].includes(ret.status) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-amber-800">
                  {pendingCount} item(s) awaiting decision
                </p>
                {!showBulk && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setBulkDecision('approved'); setShowBulk(true); }}
                      className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg font-medium
                                 hover:bg-primary-700 transition-colors">
                      ✅ Approve All
                    </button>
                    <button
                      onClick={() => { setBulkDecision('rejected'); setShowBulk(true); }}
                      className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg font-medium
                                 hover:bg-red-600 transition-colors">
                      ❌ Reject All
                    </button>
                  </div>
                )}
              </div>

              {showBulk && (
                <div className="space-y-2">
                  {bulkDecision === 'rejected' && (
                    <input className="input text-sm"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Rejection reason for all items *"/>
                  )}
                  <input className="input text-sm"
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="Admin note (optional)…"/>
                  <div className="flex gap-2">
                    <button
                      onClick={() => bulkDecide.mutate()}
                      disabled={
                        bulkDecide.isPending ||
                        (bulkDecision === 'rejected' && !rejectReason.trim())
                      }
                      className={`flex-1 py-2 text-white text-sm font-semibold rounded-xl
                        disabled:opacity-50 transition-colors
                        ${bulkDecision === 'approved'
                          ? 'bg-primary-600 hover:bg-primary-700'
                          : 'bg-red-500 hover:bg-red-600'}`}>
                      {bulkDecide.isPending
                        ? 'Processing…'
                        : `Confirm ${bulkDecision === 'approved' ? 'Approve' : 'Reject'} All`}
                    </button>
                    <button
                      onClick={() => { setShowBulk(false); setBulkDecision(''); }}
                      className="px-4 py-2 btn-secondary text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Per-item decision rows */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
              Items ({ret.items?.length})
            </p>
            <div className="space-y-2">
              {ret.items?.map(item => (
                <ItemDecisionRow
                  key={item._id}
                  item={item}
                  returnId={ret._id}
                  onDecided={() => {}}
                />
              ))}
            </div>
          </div>

          {/* Admin notes field */}
          <div>
            <label className="label">Admin Notes (visible to patient)</label>
            <textarea className="input text-sm" rows={2}
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Note for patient…"/>
          </div>

          {/* Status actions */}
          <div className="border-t border-neutral-100 pt-4 space-y-3">
            <p className="text-sm font-semibold text-neutral-700">Move Return Status</p>

            <div className="grid grid-cols-3 gap-2">
              {canReceive && (
                <button
                  onClick={() => setStatus.mutate('received')}
                  disabled={setStatus.isPending}
                  className="py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl
                             hover:bg-blue-700 transition-colors disabled:opacity-50">
                  📦 Mark Received
                </button>
              )}
              {canRefund && (
                <div className="col-span-2 space-y-2">
                  <select className="input text-sm"
                    value={refundMethod}
                    onChange={e => setRefundMethod(e.target.value)}>
                    <option value="cash">💵 Cash Refund</option>
                    <option value="credit_card">💳 Credit Card</option>
                    <option value="wallet">📱 Wallet</option>
                  </select>
                  <button
                    onClick={() => setStatus.mutate('refunded')}
                    disabled={setStatus.isPending}
                    className="w-full py-2.5 bg-primary-600 text-white text-sm font-semibold
                               rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50">
                    💰 Process Refund ({approvedAmt.toFixed(2)} EGP)
                  </button>
                </div>
              )}
              {canClose && (
                <button
                  onClick={() => setStatus.mutate('closed')}
                  disabled={setStatus.isPending}
                  className="py-2.5 bg-neutral-500 text-white text-xs font-semibold rounded-xl
                             hover:bg-neutral-600 transition-colors disabled:opacity-50">
                  🔒 Close Return
                </button>
              )}
            </div>

            {setStatus.isPending && (
              <p className="text-xs text-neutral-400 text-center animate-pulse">Processing…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Returns Page ───────────────────────────────────────────────
export default function AdminReturnsPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [selectedId,   setSelectedId]   = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);

  const { data: statsData } = useQuery({
    queryKey: ['admin-returns-stats'],
    queryFn:  () => returnsAPI.adminStats().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-returns', statusFilter, search, page],
    queryFn:  () => returnsAPI.adminGetAll({
      page, limit: 12,
      ...(statusFilter && { status: statusFilter }),
      ...(search       && { search }),
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const returns   = data?.data || [];
  const meta      = data?.meta || {};
  const stats     = statsData;

  const STATUS_FILTERS = [
    { value:'',                   label:'All' },
    { value:'pending',            label:'Pending' },
    { value:'partially_approved', label:'Partial' },
    { value:'approved',           label:'Approved' },
    { value:'rejected',           label:'Rejected' },
    { value:'received',           label:'Received' },
    { value:'refunded',           label:'Refunded' },
    { value:'closed',             label:'Closed' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">
            {t('admin.returns')}
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Manage partial & full return requests
          </p>
        </div>
        {stats?.pending > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200
                          rounded-xl text-sm text-amber-700 font-medium">
            ⏳ {stats.pending} pending review
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
        {[
          { label:'Total',     val: stats?.total                    || 0, color:'bg-neutral-50',  icon:'📋' },
          { label:'Pending',   val: stats?.byStatus?.pending        || 0, color:'bg-yellow-50',   icon:'⏳' },
          { label:'Partial',   val: stats?.byStatus?.partially_approved || 0, color:'bg-orange-50', icon:'⚡' },
          { label:'Approved',  val: stats?.byStatus?.approved       || 0, color:'bg-primary-50',  icon:'✅' },
          { label:'Rejected',  val: stats?.byStatus?.rejected       || 0, color:'bg-red-50',      icon:'❌' },
          { label:'Refunded',  val: stats?.totalRefunds
              ? `${Number(stats.totalRefunds).toLocaleString()} EGP`
              : '0 EGP',                                                   color:'bg-blue-50',    icon:'💰' },
        ].map(({ label, val, color, icon }) => (
          <div key={label} className={`card p-3 flex items-center gap-2 ${color}`}>
            <span className="text-lg">{icon}</span>
            <div>
              <p className="font-bold text-neutral-900 text-sm">{val}</p>
              <p className="text-xs text-neutral-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(sf => (
            <button key={sf.value}
              onClick={() => { setStatusFilter(sf.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${statusFilter === sf.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary-300'}`}>
              {sf.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input pl-9 text-sm py-2"
            placeholder="Search by return number…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}/>
        </div>
      </div>

      {/* Table */}
      <div className={`card transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl"/>)}
          </div>
        ) : returns.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">↩️</p>
            <p className="font-semibold text-neutral-700">No returns found</p>
            {(statusFilter || search) && (
              <button onClick={() => { setStatusFilter(''); setSearch(''); }}
                className="btn-secondary mt-4">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Return #</th>
                  <th>Patient</th>
                  <th>Order</th>
                  <th>Items</th>
                  <th>Pending</th>
                  <th>Est. Refund</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {returns.map(ret => {
                  const cfg          = STATUS_CFG[ret.status] || { label:ret.status, badge:'badge-gray', icon:'•' };
                  const pendingItems = ret.items?.filter(i => i.status === 'pending').length || 0;
                  const estRefund    = ret.items
                    ?.filter(i => i.status === 'approved')
                    .reduce((s, i) => s + i.price * i.returnedQty, 0) || 0;

                  return (
                    <tr key={ret._id}>
                      <td className="font-mono text-sm font-semibold text-primary-700">
                        {ret.returnNumber}
                      </td>
                      <td>
                        <p className="text-sm font-medium">{ret.patient?.name}</p>
                        <p className="text-xs text-neutral-400">{ret.patient?.email}</p>
                      </td>
                      <td className="font-mono text-xs text-primary-600">
                        {ret.order?.orderNumber}
                      </td>
                      <td className="text-sm text-neutral-600">
                        {ret.items?.length} item(s)
                      </td>
                      <td>
                        {pendingItems > 0 ? (
                          <span className="badge-yellow text-xs font-bold">
                            {pendingItems} pending
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="font-semibold text-primary-700 text-sm">
                        {estRefund > 0
                          ? `${estRefund.toFixed(2)} EGP`
                          : <span className="text-neutral-400 text-xs">Pending</span>
                        }
                      </td>
                      <td>
                        <span className={`${cfg.badge} text-xs`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="text-xs text-neutral-500">
                        {format(new Date(ret.createdAt), 'dd/MM/yyyy')}
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedId(ret._id)}
                          className="btn-secondary btn-sm">
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">
              {((meta.page-1)*meta.limit)+1}–{Math.min(meta.page*meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex gap-1">
              <button disabled={meta.page<=1} onClick={()=>setPage(p=>p-1)}
                className="btn-ghost btn-sm disabled:opacity-40">← Prev</button>
              {[...Array(Math.min(meta.totalPages, 7))].map((_, i) => (
                <button key={i+1} onClick={()=>setPage(i+1)}
                  className={`w-8 h-8 rounded-lg text-sm ${meta.page===i+1
                    ? 'bg-primary-600 text-white' : 'hover:bg-neutral-100'}`}>
                  {i+1}
                </button>
              ))}
              <button disabled={meta.page>=meta.totalPages} onClick={()=>setPage(p=>p+1)}
                className="btn-ghost btn-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Return Detail Modal */}
      {selectedId && (
        <ReturnModal
          returnId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
