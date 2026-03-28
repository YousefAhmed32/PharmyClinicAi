import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';
import { format } from 'date-fns';
import useAuthStore from '@/store/authStore';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;

const RETURN_STATUS_CFG = {
  pending:            { badge:'badge-yellow', icon:'⏳' },
  partially_approved: { badge:'badge-orange', icon:'⚡' },
  approved:           { badge:'badge-green',  icon:'✅' },
  rejected:           { badge:'badge-red',    icon:'❌' },
  received:           { badge:'badge-blue',   icon:'📦' },
  refunded:           { badge:'badge-gray',   icon:'💰' },
  closed:             { badge:'badge-gray',   icon:'🔒' },
};

const ITEM_STATUS_CFG = {
  pending:  { color:'text-yellow-600 bg-yellow-50 border-yellow-200', icon:'⏳' },
  approved: { color:'text-primary-700 bg-primary-50 border-primary-200', icon:'✅' },
  rejected: { color:'text-red-600 bg-red-50 border-red-200', icon:'❌' },
};

export default function ReturnsPage() {
  const { t }           = useTranslation();
  const { accessToken } = useAuthStore();
  const [expanded, setExpanded] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-returns'],
    queryFn:  () => api.get('/returns/my', { params: { limit: 50 } }).then(r => r.data.data),
    enabled: !!accessToken,
  });

  const returns = Array.isArray(data) ? data : [];

  return (
    <div className="section">
      <div className="container-app max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="section-title">{t('returns.title')}</h1>
            <p className="section-subtitle mt-1">{returns.length} requests</p>
          </div>
          <Link to="/orders" className="btn-secondary btn-sm">
            ← {t('orders.title')}
          </Link>
        </div>

        {/* How it works */}
        <div className="card p-4 mb-6 bg-primary-50/40 border border-primary-100">
          <p className="text-xs font-semibold text-primary-700 mb-2">📋 How returns work</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon:'1️⃣', key:'Select items from a delivered order' },
              { icon:'2️⃣', key:'We review each item separately' },
              { icon:'3️⃣', key:'Ship back approved items' },
              { icon:'4️⃣', key:'Refund processed' },
            ].map(s => (
              <div key={s.icon} className="text-center">
                <div className="text-xl mb-1">{s.icon}</div>
                <p className="text-[10px] text-primary-700 font-medium leading-tight">{s.key}</p>
              </div>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-2xl"/>
            ))}
          </div>
        ) : returns.length === 0 ? (
          <div className="card p-16 text-center">
            <p className="text-5xl mb-4">↩️</p>
            <p className="font-semibold text-neutral-700">{t('returns.noReturns')}</p>
            <p className="text-sm text-neutral-400 mt-2 mb-5">
              You can return items from delivered orders
            </p>
            <Link to="/orders" className="btn-primary">{t('orders.title')}</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map(ret => {
              const cfg        = RETURN_STATUS_CFG[ret.status] || { badge:'badge-gray', icon:'•' };
              const isExpanded = expanded === ret._id;

              return (
                <div key={ret._id} className="card p-5">
                  {/* Return header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-primary-700 text-sm">
                          {ret.returnNumber}
                        </span>
                        <span className={`${cfg.badge} text-xs`}>
                          {cfg.icon} {t(`returns.statuses.${ret.status}`)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Order: <span className="font-medium">{ret.order?.orderNumber || '—'}</span>
                        {' · '}
                        {format(new Date(ret.createdAt), 'dd MMM yyyy')}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {ret.items?.length} item(s) ·
                        {ret.refundAmount > 0
                          ? <> Refund: <span className="font-semibold text-primary-700">{ret.refundAmount.toFixed(2)} EGP</span></>
                          : <> Refund: pending review</>
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : ret._id)}
                      className="btn-ghost btn-sm text-xs shrink-0">
                      {isExpanded ? 'Hide ▲' : 'Details ▼'}
                    </button>
                  </div>

                  {/* Per-item breakdown */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3 animate-fade-in">

                      {/* Items with per-item status */}
                      <div>
                        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                          Items & Status
                        </p>
                        <div className="space-y-2">
                          {ret.items?.map(item => {
                            const iCfg = ITEM_STATUS_CFG[item.status] || ITEM_STATUS_CFG.pending;
                            return (
                              <div key={item._id}
                                className={`flex items-center gap-3 p-2.5 rounded-xl border ${iCfg.color}`}>
                                <div className="w-8 h-8 rounded-lg bg-white/80 overflow-hidden shrink-0">
                                  {item.image
                                    ? <img src={`${URL_IMAGE}/api/images/${item.image}`} alt="" className="w-full h-full object-cover"/>
                                    : <div className="w-full h-full flex items-center justify-center text-sm">💊</div>
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{item.name}</p>
                                  <p className="text-xs opacity-70">
                                    Returning {item.returnedQty} of {item.orderedQty} ·
                                    {t(`returns.reasons.${item.reason}`)}
                                  </p>
                                  {item.rejectionReason && (
                                    <p className="text-xs text-red-600 mt-0.5">
                                      Rejected: {item.rejectionReason}
                                    </p>
                                  )}
                                  {item.adminNote && (
                                    <p className="text-xs opacity-70 mt-0.5 italic">
                                      Note: {item.adminNote}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-bold">
                                    {iCfg.icon} {t(`returns.itemStatus.${item.status}`)}
                                  </span>
                                  {item.status === 'approved' && (
                                    <p className="text-xs font-semibold text-primary-700 mt-0.5">
                                      {(item.price * item.returnedQty).toFixed(2)} EGP
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Admin notes */}
                      {ret.adminNotes && (
                        <div className="p-3 bg-primary-50 rounded-xl border border-primary-100">
                          <p className="text-xs text-primary-600 font-semibold mb-1">
                            Note from pharmacy:
                          </p>
                          <p className="text-sm text-primary-800">{ret.adminNotes}</p>
                        </div>
                      )}

                      {/* Refund info */}
                      {ret.status === 'refunded' && (
                        <div className="p-3 bg-primary-50 rounded-xl flex items-center gap-2">
                          <span>💰</span>
                          <p className="text-sm font-semibold text-primary-700">
                            {ret.refundAmount?.toFixed(2)} EGP refunded
                            {ret.refundMethod && ` via ${ret.refundMethod}`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
