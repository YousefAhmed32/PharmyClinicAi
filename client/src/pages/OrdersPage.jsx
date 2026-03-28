import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ordersAPI } from '@/api/services';
import { format } from 'date-fns';
import { OrderSkeleton } from '@/components/ui/Skeletons';
import { EmptyState, StatusBadge, Pagination } from '@/components/ui/UIComponents';

const PROGRESS_STEPS = ['pending','confirmed','processing','out_for_delivery','delivered'];

function OrderProgress({ status, t }) {
  if (['cancelled','rejected','returned','refunded'].includes(status)) {
    return (
      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 h-1 rounded-full bg-red-200"/>
        <span className="text-xs text-red-500 shrink-0">{t(`orders.statuses.${status}`)}</span>
      </div>
    );
  }
  const currentStep = PROGRESS_STEPS.indexOf(status);
  return (
    <div className="flex items-center mt-3">
      {PROGRESS_STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${i <= currentStep ? 'bg-primary-600' : 'bg-neutral-200'}`}/>
          {i < PROGRESS_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-primary-600' : 'bg-neutral-200'}`}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

const STATUS_BADGE_MAP = {
  pending:'badge-yellow', reviewing:'badge-blue', confirmed:'badge-green',
  processing:'badge-blue', ready_for_pickup:'badge-green', out_for_delivery:'badge-orange',
  delivered:'badge-green', cancelled:'badge-red', rejected:'badge-red',
  returned:'badge-gray', refunded:'badge-gray',
};

export default function OrdersPage() {
  const { t } = useTranslation();
  const [page, setPage]                 = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', page, statusFilter],
    queryFn:  () => ordersAPI.getMyOrders({
      page, limit: 8,
      ...(statusFilter && { status: statusFilter }),
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const orders = data?.data || [];
  const meta   = data?.meta || {};

  const STATUS_FILTERS = [
    { value: '',                label: t('common.all') },
    { value: 'pending',         label: t('orders.statuses.pending') },
    { value: 'confirmed',       label: t('orders.statuses.confirmed') },
    { value: 'out_for_delivery',label: t('orders.statuses.out_for_delivery') },
    { value: 'delivered',       label: t('orders.statuses.delivered') },
    { value: 'cancelled',       label: t('orders.statuses.cancelled') },
    { value: 'returned',        label: t('orders.statuses.returned') },
  ];

  return (
    <div className="section">
      <div className="container-app max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="section-title">{t('orders.title')}</h1>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button key={value} onClick={() => { setStatusFilter(value); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <OrderSkeleton key={i}/>)}
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-16 text-center">
            <p className="text-5xl mb-4">📦</p>
            <h2 className="font-display font-semibold text-xl mb-2">{t('orders.noOrders')}</h2>
            <p className="text-neutral-500 mb-6">{t('orders.noOrdersDesc')}</p>
            <Link to="/store" className="btn-primary">{t('common.shopNow')}</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order._id} className="card p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <Link to={`/orders/${order._id}`}
                      className="font-semibold text-neutral-800 font-mono text-sm hover:text-primary-700">
                      {t('orders.orderNumber')}{order.orderNumber}
                    </Link>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {format(new Date(order.createdAt), 'dd MMM yyyy')} · {order.items?.length} {t('cart.items')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={STATUS_BADGE_MAP[order.status] || 'badge-gray'}>
                      {t(`orders.statuses.${order.status}`) || order.status}
                    </span>
                    <p className="font-bold text-neutral-900 text-sm">
                      {order.total?.toFixed(2)} {t('common.currency')}
                    </p>
                  </div>
                </div>

                <OrderProgress status={order.status} t={t}/>

                <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-100">
                  <Link to={`/orders/${order._id}`} className="btn-secondary btn-sm flex-1 justify-center">
                    {t('common.details')}
                  </Link>
                  <Link to={`/invoice/${order._id}`} className="btn-ghost btn-sm">
                    {t('orders.invoice')}
                  </Link>
                </div>
              </div>
            ))}

            {meta.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}