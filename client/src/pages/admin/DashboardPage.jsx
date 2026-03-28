import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { analyticsAPI } from '@/api/analyticsAPI';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ordersAPI } from '@/api/services';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;


function KpiCard({ title, value, sub, icon, color, trend, link, alert }) {
  const card = (
    <div className={`card p-5 border-s-4 ${color} ${link ? 'hover:shadow-lifted transition-shadow cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {trend !== null && trend !== undefined && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${parseFloat(trend) >= 0 ? 'bg-primary-50 text-primary-700' : 'bg-red-50 text-red-600'}`}>
            {parseFloat(trend) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(trend))}%
          </span>
        )}
        {alert && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">!</span>}
      </div>
      <p className="font-display font-bold text-2xl text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{title}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );
  return link ? <Link to={link}>{card}</Link> : card;
}

function SparkBar({ data = [], color = '#339966' }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-px h-12">
      {data.map((d, i) => (
        <div key={i} className="flex-1 rounded-t-sm transition-all"
          style={{ height: `${Math.max(4, Math.round((d.value / max) * 48))}px`, backgroundColor: color, opacity: 0.7 + (i / data.length) * 0.3 }}
          title={`${d.label}: ${d.value}`}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();

  const STATUS_CONFIG = {
    pending:          { label: t('orders.statuses.pending'),          badge:'badge-yellow', icon:'⏳' },
    reviewing:        { label: t('orders.statuses.reviewing'),        badge:'badge-blue',   icon:'🔍' },
    confirmed:        { label: t('orders.statuses.confirmed'),        badge:'badge-green',  icon:'✅' },
    processing:       { label: t('orders.statuses.processing'),       badge:'badge-blue',   icon:'📦' },
    ready_for_pickup: { label: t('orders.statuses.ready_for_pickup'), badge:'badge-green',  icon:'🏪' },
    out_for_delivery: { label: t('orders.statuses.out_for_delivery'), badge:'badge-orange', icon:'🚚' },
    delivered:        { label: t('orders.statuses.delivered'),        badge:'badge-green',  icon:'🎉' },
    cancelled:        { label: t('orders.statuses.cancelled'),        badge:'badge-red',    icon:'❌' },
    rejected:         { label: t('orders.statuses.rejected'),         badge:'badge-red',    icon:'🚫' },
    returned:         { label: t('orders.statuses.returned'),         badge:'badge-gray',   icon:'↩️' },
    refunded:         { label: t('orders.statuses.refunded'),         badge:'badge-gray',   icon:'💰' },
  };

  const { data: overview }   = useQuery({ queryKey:['admin-overview'],   queryFn:() => analyticsAPI.getOverview().then(r => r.data.data) });
  const { data: revData }    = useQuery({ queryKey:['admin-rev-7d'],     queryFn:() => analyticsAPI.getRevenue({ days:14 }).then(r => r.data.data) });
  const { data: topProds }   = useQuery({ queryKey:['admin-top-5'],      queryFn:() => analyticsAPI.getTopProducts({ limit:5 }).then(r => r.data.data) });
  const { data: recentOrds } = useQuery({ queryKey:['admin-recent-ord'], queryFn:() => ordersAPI.getAll({ limit:8 }).then(r => r.data.data) });

  const ov = overview;
  const sparkData = (revData || []).map(d => ({ label: d.date.slice(5), value: d.revenue }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">{t('admin.dashboard')}</h1>
        <p className="text-neutral-500 text-sm mt-0.5">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t('admin.totalRevenue')}
          value={`${(ov?.revenue?.total||0).toLocaleString()} ${t('common.currency')}`}
          sub={`${t('common.total')}: ${(ov?.revenue?.thisMonth||0).toLocaleString()} ${t('common.currency')}`}
          icon="💰" color="border-primary-500" trend={ov?.revenue?.growth} link="/admin/reports"/>
        <KpiCard
          title={t('admin.totalOrders')}
          value={(ov?.orders?.total||0).toLocaleString()}
          sub={`${t('orders.statuses.confirmed')}: ${ov?.orders?.active||0}`}
          icon="📦" color="border-blue-500" link="/admin/orders"/>
        <KpiCard
          title={t('admin.totalUsers')}
          value={(ov?.users?.total||0).toLocaleString()}
          sub={`+${ov?.users?.newThisMonth||0}`}
          icon="👥" color="border-purple-500" link="/admin/users"/>
        <KpiCard
          title={t('admin.stockAlerts')}
          value={(ov?.inventory?.outOfStock||0) + (ov?.inventory?.lowStock||0)}
          sub={`${t('store.outOfStock')}: ${ov?.inventory?.outOfStock||0} · ${t('store.lowStock')}: ${ov?.inventory?.lowStock||0}`}
          icon="🏪" color="border-orange-500" alert={ov?.inventory?.outOfStock > 0} link="/admin/inventory"/>
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t('orders.statuses.pending')}         value={ov?.orders?.pending||0}          icon="⏳" color="border-yellow-400" link="/admin/orders?status=pending"/>
        <KpiCard title={t('orders.statuses.out_for_delivery')} value={ov?.orders?.out_for_delivery||0} icon="🚚" color="border-orange-400" link="/admin/orders?status=out_for_delivery"/>
        <KpiCard title={t('admin.pendingReturns')}            value={ov?.returns?.total||0}            sub={`${t('common.status')}: ${ov?.returns?.pending||0}`} icon="↩️" color="border-red-400" link="/admin/returns"/>
        <KpiCard title={t('admin.appointments')}              value={ov?.appointments?.pending||0}     icon="📅" color="border-primary-400" link="/admin/appointments"/>
      </div>

      {/* Revenue chart + Order status */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Revenue chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-800">{t('admin.revenueChart')} — 14d</h2>
            <Link to="/admin/reports" className="text-xs text-primary-600 hover:underline">{t('common.details')} →</Link>
          </div>
          {revData ? (
            <>
              <SparkBar data={sparkData}/>
              <div className="flex justify-between text-xs text-neutral-400 mt-2">
                <span>{sparkData[0]?.label}</span>
                <span>{sparkData[sparkData.length-1]?.label}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  [t('common.total'), `${(ov?.revenue?.total||0).toLocaleString()} ${t('common.currency')}`],
                  [t('admin.totalOrders'), ov?.orders?.total||0],
                  [t('orders.statuses.delivered'), ov?.orders?.delivered||0],
                ].map(([label, val]) => (
                  <div key={label} className="bg-neutral-50 rounded-xl p-3">
                    <p className="text-xs text-neutral-400">{label}</p>
                    <p className="font-bold text-neutral-800 text-sm mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="skeleton h-28 rounded-xl"/>}
        </div>

        {/* Order status breakdown */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-800">{t('admin.ordersChart')}</h2>
            <Link to="/admin/orders" className="text-xs text-primary-600 hover:underline">{t('common.seeAll')} →</Link>
          </div>
          {ov ? (
            <div className="space-y-2">
              {[
                ['pending',          ov.orders?.pending          || 0],
                ['reviewing',        ov.orders?.reviewing        || 0],
                ['confirmed',        ov.orders?.confirmed        || 0],
                ['processing',       ov.orders?.processing       || 0],
                ['out_for_delivery', ov.orders?.out_for_delivery || 0],
                ['delivered',        ov.orders?.delivered        || 0],
                ['returned',         ov.orders?.returned         || 0],
                ['cancelled',        ov.orders?.cancelled        || 0],
              ].filter(([, count]) => count > 0).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status] || { label: status, icon: '•' };
                const pct = ov.orders?.total > 0 ? Math.round((count / ov.orders.total) * 100) : 0;
                return (
                  <Link key={status} to={`/admin/orders?status=${status}`}
                    className="flex items-center gap-3 hover:bg-neutral-50 rounded-lg p-1.5 -mx-1.5 transition-colors">
                    <span className="text-sm shrink-0">{cfg.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-neutral-700">{cfg.label}</span>
                        <span className="text-neutral-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width:`${pct}%` }}/>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : <div className="skeleton h-48 rounded-xl"/>}
        </div>
      </div>

      {/* Top products + Recent orders */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-800">{t('admin.topProducts')}</h2>
            <Link to="/admin/analytics" className="text-xs text-primary-600 hover:underline">{t('common.seeAll')} →</Link>
          </div>
          {topProds ? (
            <div className="space-y-3">
              {topProds.map((p, i) => (
                <div key={p._id} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-500 text-xs flex items-center justify-center font-bold shrink-0">{i+1}</span>
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                    {p.image ? <img src={`${URL_IMAGE}/api/images/${p.image}`} className="w-full h-full object-cover" alt={p.name}/> : <div className="w-full h-full flex items-center justify-center text-sm">💊</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{p.name}</p>
                    <p className="text-xs text-neutral-400">{p.sold} {t('common.quantity')}</p>
                  </div>
                  <p className="text-sm font-bold text-primary-700 shrink-0">{p.revenue?.toLocaleString()} {t('common.currency')}</p>
                </div>
              ))}
            </div>
          ) : <div className="skeleton h-40 rounded-xl"/>}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-800">{t('admin.recentOrders')}</h2>
            <Link to="/admin/orders" className="text-xs text-primary-600 hover:underline">{t('common.seeAll')} →</Link>
          </div>
          {recentOrds ? (
            <div className="space-y-2">
              {recentOrds.slice(0, 6).map(o => {
                const cfg = STATUS_CONFIG[o.status] || { label:o.status, badge:'badge-gray', icon:'•' };
                return (
                  <Link key={o._id} to="/admin/orders"
                    className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 rounded-lg px-1 -mx-1 transition-colors">
                    <div>
                      <p className="text-xs font-mono font-semibold text-primary-700">{o.orderNumber}</p>
                      <p className="text-xs text-neutral-400">{o.user?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`${cfg.badge} text-xs`}>{cfg.icon} {cfg.label}</span>
                      <span className="text-xs font-bold text-neutral-800">{o.total?.toFixed(0)} {t('common.currency')}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : <div className="skeleton h-40 rounded-xl"/>}
        </div>
      </div>

      {/* Alerts */}
      {ov && (ov.inventory?.outOfStock > 0 || ov.returns?.pending > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {ov.inventory?.outOfStock > 0 && (
            <Link to="/admin/inventory"
              className="card p-4 border border-red-200 bg-red-50 flex items-center gap-3 hover:shadow-lifted transition-shadow">
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-semibold text-red-700">{ov.inventory.outOfStock} {t('admin.lowStockAlert')}</p>
                <p className="text-xs text-red-500">{t('common.view')} →</p>
              </div>
            </Link>
          )}
          {ov.returns?.pending > 0 && (
            <Link to="/admin/returns"
              className="card p-4 border border-orange-200 bg-orange-50 flex items-center gap-3 hover:shadow-lifted transition-shadow">
              <span className="text-2xl">↩️</span>
              <div>
                <p className="font-semibold text-orange-700">{ov.returns.pending} {t('admin.pendingReturns')}</p>
                <p className="text-xs text-orange-500">{t('common.view')} →</p>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}