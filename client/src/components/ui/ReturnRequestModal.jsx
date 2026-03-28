import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;
const REASON_OPTIONS = [
  { value: 'wrong_product',    icon: '📦' },
  { value: 'damaged',          icon: '💔' },
  { value: 'expired',          icon: '⚠️' },
  { value: 'not_as_described', icon: '❓' },
  { value: 'changed_mind',     icon: '🔄' },
  { value: 'other',            icon: '📝' },
];

// Per-item selection row
function ItemRow({ item, selection, onChange }) {
  const { t } = useTranslation();
  const pid   = (item.product?._id || item.product || item._id).toString();
  const sel   = selection[pid];

  const toggle = () => {
    if (sel) {
      const next = { ...selection };
      delete next[pid];
      onChange(next);
    } else {
      onChange({
        ...selection,
        [pid]: { qty: 1, max: item.quantity, reason: '', reasonDetails: '' },
      });
    }
  };

  const setField = (field, value) => {
    onChange({ ...selection, [pid]: { ...sel, [field]: value } });
  };

  const setQty = (val) => {
    const q = Math.max(1, Math.min(sel.max, Number(val)));
    setField('qty', q);
  };

  return (
    <div className={`rounded-xl border-2 transition-all overflow-hidden
      ${sel ? 'border-primary-400 bg-primary-50/20' : 'border-neutral-200 hover:border-neutral-300'}`}>

      {/* Item header — click to toggle */}
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={toggle}>
        {/* Checkbox */}
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
          ${sel ? 'bg-primary-600 border-primary-600' : 'border-neutral-300'}`}>
          {sel && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>

        {/* Image */}
        <div className="w-10 h-10 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
          {item.image
            ? <img
            src={`${URL_IMAGE}/api/images/${item.image}`}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => (e.target.src = "/placeholder.png")}
          />
            : <div className="w-full h-full flex items-center justify-center">💊</div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-800 truncate">{item.name}</p>
          <p className="text-xs text-neutral-500">
            {t('orders.statuses.confirmed')} × {item.quantity} · {item.price} EGP
          </p>
        </div>

        {/* Total */}
        <p className="text-sm font-bold text-neutral-700 shrink-0">
          {(item.price * item.quantity).toFixed(2)} EGP
        </p>
      </div>

      {/* Expanded controls when selected */}
      {sel && (
        <div className="px-3 pb-3 space-y-3 border-t border-primary-100 pt-3"
          onClick={e => e.stopPropagation()}>

          {/* Quantity */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 shrink-0 w-28">
              {t('returns.returnedQty')}:
            </span>
            <div className="flex items-center bg-neutral-100 rounded-xl p-0.5">
              <button onClick={() => setQty(sel.qty - 1)}
                className="w-7 h-7 rounded-lg bg-white text-base font-bold flex items-center justify-center">−</button>
              <span className="w-8 text-center text-sm font-bold">{sel.qty}</span>
              <button onClick={() => setQty(sel.qty + 1)}
                className="w-7 h-7 rounded-lg bg-white text-base font-bold flex items-center justify-center">+</button>
            </div>
            <span className="text-xs text-neutral-400">/ {item.quantity}</span>
            <span className="text-xs font-semibold text-primary-700 ms-auto">
              ≈ {(item.price * sel.qty).toFixed(2)} EGP
            </span>
          </div>

          {/* Reason for this item */}
          <div>
            <p className="text-xs text-neutral-500 mb-1.5">{t('returns.selectReason')}:</p>
            <div className="flex flex-wrap gap-1.5">
              {REASON_OPTIONS.map(r => (
                <button key={r.value} type="button"
                  onClick={() => setField('reason', r.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all
                    ${sel.reason === r.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary-300'}`}>
                  {r.icon} {t(`returns.reasons.${r.value}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Optional details */}
          <input
            type="text"
            className="input text-xs py-1.5"
            value={sel.reasonDetails}
            onChange={e => setField('reasonDetails', e.target.value)}
            placeholder={`${t('common.optional')}: describe the issue...`}
          />
        </div>
      )}
    </div>
  );
}

export default function ReturnRequestModal({ order, onClose }) {
  const { t }  = useTranslation();
  const qc     = useQueryClient();
  const [selection, setSelection] = useState({});

  const selectedEntries = Object.entries(selection);
  const selectedCount   = selectedEntries.length;
  const estimatedRefund = order.items
    .filter(i => selection[(i.product?._id || i.product || i._id).toString()])
    .reduce((s, i) => {
      const pid = (i.product?._id || i.product || i._id).toString();
      const sel = selection[pid];
      return s + i.price * (sel?.qty || 0);
    }, 0);

  const canSubmit = selectedCount > 0 &&
    selectedEntries.every(([, v]) => v.reason);

  const submit = useMutation({
    mutationFn: () => {
      const items = order.items
        .filter(i => selection[(i.product?._id || i.product || i._id).toString()])
        .map(i => {
          const pid = (i.product?._id || i.product || i._id).toString();
          const sel = selection[pid];
          return {
            productId:     pid,
            returnedQty:   sel.qty,
            reason:        sel.reason,
            reasonDetails: sel.reasonDetails || null,
          };
        });

      return api.post('/returns', { orderId: order._id, items });
    },
    onSuccess: () => {
      toast.success(t('returns.submitReturn') + ' ✓');
      qc.invalidateQueries(['order', order._id]);
      qc.invalidateQueries(['my-returns']);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || t('errors.unknown')),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose}/>
      <div className="relative z-50 bg-white rounded-2xl shadow-lifted w-full max-w-lg
                      max-h-[90vh] flex flex-col animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 shrink-0">
          <div>
            <h2 className="font-semibold text-lg">{t('orders.returnItems')}</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {order.orderNumber} · {order.items.length} {t('cart.items')}
            </p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-xs text-neutral-500">
            {t('returns.selectItems')} — {t('returns.returnedQty')} per item:
          </p>
          {order.items.map(item => (
            <ItemRow
              key={(item.product?._id || item.product || item._id).toString()}
              item={item}
              selection={selection}
              onChange={setSelection}
            />
          ))}
        </div>

        {/* Summary */}
        {selectedCount > 0 && (
          <div className="px-5 py-3 border-t border-neutral-100 bg-primary-50/30">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">
                {selectedCount} {t('cart.items')} selected
              </span>
              <span className="font-semibold text-primary-700">
                {t('returns.estimatedRefund')}: {estimatedRefund.toFixed(2)} EGP
              </span>
            </div>
            {selectedEntries.some(([, v]) => !v.reason) && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Please select a reason for each item
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-neutral-100 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">{t('common.cancel')}</button>
          <button
            onClick={() => submit.mutate()}
            disabled={!canSubmit || submit.isPending}
            className="btn-primary flex-1 justify-center disabled:opacity-40">
            {submit.isPending
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".25"/>
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg> Submitting...</>
              : `📤 ${t('returns.submitReturn')}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
