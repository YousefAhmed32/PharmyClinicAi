import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '@/api/analyticsAPI';
import {
  exportToExcel,
  ORDERS_COLUMNS, PRODUCTS_COLUMNS, USERS_COLUMNS,
  INVENTORY_COLUMNS, APPOINTMENTS_COLUMNS, REVENUE_COLUMNS,
  prepareInventoryData,
} from '@/utils/excelExport';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import toast from 'react-hot-toast';

const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;

// Presets use label keys — translated in the component
const PRESET_DEFS = [
  { key: 'today',     from: () => format(new Date(), 'yyyy-MM-dd'),               to: () => format(new Date(), 'yyyy-MM-dd') },
  { key: 'last7',     from: () => format(subDays(new Date(), 6), 'yyyy-MM-dd'),   to: () => format(new Date(), 'yyyy-MM-dd') },
  { key: 'last30',    from: () => format(subDays(new Date(), 29), 'yyyy-MM-dd'),  to: () => format(new Date(), 'yyyy-MM-dd') },
  { key: 'thisMonth', from: () => format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: () => format(endOfMonth(new Date()), 'yyyy-MM-dd') },
  { key: 'thisYear',  from: () => format(startOfYear(new Date()), 'yyyy-MM-dd'),  to: () => format(new Date(), 'yyyy-MM-dd') },
  { key: 'allTime',   from: () => '2020-01-01',                                   to: () => format(new Date(), 'yyyy-MM-dd') },
];

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon, color, trend, trendLabel }) {
  return (
    <div className={`card p-5 border-l-4 ${color}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {trend !== undefined && trend !== null && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            parseFloat(trend) >= 0 ? 'bg-primary-50 text-primary-700' : 'bg-red-50 text-red-600'
          }`}>
            {parseFloat(trend) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(trend))}%
          </span>
        )}
      </div>
      <p className="font-display font-bold text-2xl text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{title}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
      {trendLabel && <p className="text-xs text-neutral-400 mt-0.5">{trendLabel}</p>}
    </div>
  );
}

// ── Mini table ────────────────────────────────────────────────────────────
function MiniTable({ title, columns, rows, emptyMsg }) {
  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-neutral-100">
        <h3 className="font-semibold text-neutral-800">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-center text-neutral-400 text-sm py-8">{emptyMsg}</p>
      ) : (
        <div className="table-wrapper rounded-none border-0">
          <table className="table">
            <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map(c => (
                    <td key={c.key} className={c.className || 'text-sm'}>
                      {c.render ? c.render(row) : c.key.split('.').reduce((o, k) => o?.[k], row) ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Export Button ─────────────────────────────────────────────────────────
function ExportBtn({ label, onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-neutral-200 bg-white
                 hover:border-primary-400 hover:bg-primary-50 text-sm font-medium text-neutral-700
                 hover:text-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
      {loading
        ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
            <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        : <span>📥</span>
      }
      {label}
    </button>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();

  const PRESETS = PRESET_DEFS.map(p => ({
    key: p.key,
    label: t(`reports.presets.${p.key}`),
    from: p.from(),
    to: p.to(),
  }));

  const [dateRange,    setDateRange]   = useState({ from: PRESETS[2].from, to: PRESETS[2].to });
  const [activePreset, setActivePreset] = useState(PRESETS[2].key);
  const [exporting,    setExporting]   = useState({});

  const applyPreset = (preset) => {
    setActivePreset(preset.key);
    setDateRange({ from: preset.from, to: preset.to });
  };

  const days = Math.max(1, Math.round((new Date(dateRange.to) - new Date(dateRange.from)) / 86400000) + 1);

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: overview }    = useQuery({ queryKey: ['rep-overview'],        queryFn: () => analyticsAPI.getOverview().then(r => r.data.data) });
  const { data: revData }     = useQuery({ queryKey: ['rep-revenue', days],   queryFn: () => analyticsAPI.getRevenue({ days }).then(r => r.data.data) });
  const { data: topProducts } = useQuery({ queryKey: ['rep-top', dateRange],  queryFn: () => analyticsAPI.getTopProducts({ limit: 10 }).then(r => r.data.data) });
  const { data: catData }     = useQuery({ queryKey: ['rep-cats'],            queryFn: () => analyticsAPI.getCategories().then(r => r.data.data) });

  // ── Computed metrics ─────────────────────────────────────────────────────
  const totalRevenue  = revData?.reduce((s, d) => s + d.revenue, 0) || 0;
  const totalOrders   = revData?.reduce((s, d) => s + d.orders,  0) || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const avgDailyRev   = totalRevenue / days;

  const prevHalf      = revData?.slice(0, Math.floor(revData.length / 2)) || [];
  const currHalf      = revData?.slice(Math.floor(revData.length / 2))    || [];
  const prevRev       = prevHalf.reduce((s, d) => s + d.revenue, 0);
  const currRev       = currHalf.reduce((s, d) => s + d.revenue, 0);
  const revenueGrowth = prevRev > 0 ? (((currRev - prevRev) / prevRev) * 100).toFixed(1) : null;

  const bestDay  = revData?.reduce((best, d)  => d.revenue > (best?.revenue || 0)          ? d : best,  null);
  const worstDay = revData?.reduce((worst, d) => d.revenue < (worst?.revenue ?? Infinity)  ? d : worst, null);

  // ── Export handlers ──────────────────────────────────────────────────────
  const handleExport = async (type) => {
    setExporting(e => ({ ...e, [type]: true }));
    try {
      const res = await analyticsAPI.exportExcel(type, { from: dateRange.from, to: dateRange.to });
      const raw = res.data.data || [];

      const sheetMap = {
        orders:       { name: t('reports.sheets.orders'),       cols: ORDERS_COLUMNS,       data: raw.map(o => ({ ...o, createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : '—' })) },
        products:     { name: t('reports.sheets.products'),     cols: PRODUCTS_COLUMNS,     data: raw.map(p => ({ ...p, createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—' })) },
        users:        { name: t('reports.sheets.users'),        cols: USERS_COLUMNS,        data: raw.map(u => ({ ...u, createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : '—', lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-GB') : t('reports.never') })) },
        inventory:    { name: t('reports.sheets.inventory'),    cols: INVENTORY_COLUMNS,    data: prepareInventoryData(raw) },
        appointments: { name: t('reports.sheets.appointments'), cols: APPOINTMENTS_COLUMNS, data: raw.map(a => ({ ...a, createdAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB') : '—' })) },
      };

      const sheet = sheetMap[type];
      exportToExcel([{ name: sheet.name, columns: sheet.cols, data: sheet.data }], `pharmyclinic_${type}`);
      toast.success(t('reports.exportSuccess', { name: sheet.name }));
    } catch (err) {
      toast.error(err.response?.data?.message || t('reports.exportFailed'));
    } finally {
      setExporting(e => ({ ...e, [type]: false }));
    }
  };

  const handleFullReport = async () => {
    setExporting(e => ({ ...e, full: true }));
    try {
      const [ordersRes, productsRes, usersRes, apptRes] = await Promise.all([
        analyticsAPI.exportExcel('orders',       { from: dateRange.from, to: dateRange.to }),
        analyticsAPI.exportExcel('products',     {}),
        analyticsAPI.exportExcel('users',        {}),
        analyticsAPI.exportExcel('appointments', { from: dateRange.from, to: dateRange.to }),
      ]);

      const revSummary = revData || [];

      exportToExcel([
        {
          name: t('reports.sheets.revenueSummary'),
          columns: [...REVENUE_COLUMNS, { header: t('reports.avgOrderCol'), key: '_avg', width: 16 }],
          data: revSummary.map(d => ({ ...d, _avg: d.orders > 0 ? (d.revenue / d.orders).toFixed(2) : 0 })),
        },
        {
          name: t('reports.sheets.orders'),
          columns: ORDERS_COLUMNS,
          data: (ordersRes.data.data || []).map(o => ({ ...o, createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : '—' })),
        },
        {
          name: t('reports.sheets.products'),
          columns: PRODUCTS_COLUMNS,
          data: (productsRes.data.data || []).map(p => ({ ...p, createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—' })),
        },
        {
          name: t('reports.sheets.patients'),
          columns: USERS_COLUMNS,
          data: (usersRes.data.data || []).map(u => ({ ...u, createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : '—', lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-GB') : t('reports.never') })),
        },
        {
          name: t('reports.sheets.appointments'),
          columns: APPOINTMENTS_COLUMNS,
          data: (apptRes.data.data || []).map(a => ({ ...a, createdAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB') : '—' })),
        },
        {
          name: t('reports.sheets.categoryBreakdown'),
          columns: [
            { header: t('reports.catCols.category'),    key: 'category',   width: 20 },
            { header: t('reports.catCols.products'),    key: 'products',   width: 12 },
            { header: t('reports.catCols.totalStock'),  key: 'totalStock', width: 14 },
            { header: t('reports.catCols.avgPrice'),    key: 'avgPrice',   width: 16 },
            { header: t('reports.catCols.unitsSold'),   key: 'sold',       width: 12 },
            { header: t('reports.catCols.revenue'),     key: 'revenue',    width: 16 },
          ],
          data: catData || [],
        },
      ], 'pharmyclinic_full_report');

      toast.success(t('reports.fullExportSuccess'));
    } catch {
      toast.error(t('reports.fullExportFailed'));
    } finally {
      setExporting(e => ({ ...e, full: false }));
    }
  };

  const activePresetLabel = PRESETS.find(p => p.key === activePreset)?.label || t('reports.presets.custom');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">{t('admin.reports')}</h1>
          <p className="text-neutral-500 text-sm mt-1">{t('reports.subtitle')}</p>
        </div>
        <button onClick={handleFullReport} disabled={exporting.full} className="btn-primary">
          {exporting.full
            ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg> {t('reports.generating')}</>
            : <> 📊 {t('reports.exportFullBtn')}</>
          }
        </button>
      </div>

      {/* Date range selector */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-neutral-700 shrink-0">📅 {t('reports.period')}:</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button key={p.key} onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activePreset === p.key
                    ? 'bg-primary-600 text-white shadow-green'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs text-neutral-500">{t('reports.from')}:</label>
            <input type="date" className="input text-sm w-36" value={dateRange.from}
              onChange={e => { setActivePreset('custom'); setDateRange(r => ({ ...r, from: e.target.value })); }}/>
            <label className="text-xs text-neutral-500">{t('reports.to')}:</label>
            <input type="date" className="input text-sm w-36" value={dateRange.to}
              onChange={e => { setActivePreset('custom'); setDateRange(r => ({ ...r, to: e.target.value })); }}/>
          </div>
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          {t('reports.showingDays', { days, from: dateRange.from, to: dateRange.to })}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t('analytics.totalRevenue')}
          value={`${totalRevenue.toLocaleString('en-EG')} ${t('common.currency')}`}
          sub={t('reports.avgPerDay', { avg: avgDailyRev.toFixed(0), currency: t('common.currency') })}
          icon="💰" color="border-primary-500"
          trend={revenueGrowth}
          trendLabel={revenueGrowth ? t('reports.vsPrev', { days: Math.floor(days/2) }) : null}
        />
        <KpiCard
          title={t('analytics.totalOrders')}
          value={totalOrders.toLocaleString()}
          sub={t('reports.ordersPerDay', { avg: (totalOrders / days).toFixed(1) })}
          icon="📦" color="border-blue-500"
        />
        <KpiCard
          title={t('analytics.avgOrderValue')}
          value={`${avgOrderValue.toFixed(2)} ${t('common.currency')}`}
          sub={t('reports.fromOrders', { count: totalOrders })}
          icon="🧾" color="border-purple-500"
        />
        <KpiCard
          title={t('reports.revenueGrowth')}
          value={revenueGrowth !== null ? `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}%` : 'N/A'}
          sub={t('reports.firstVsSecondHalf')}
          icon={revenueGrowth >= 0 ? '📈' : '📉'}
          color={revenueGrowth >= 0 ? 'border-primary-500' : 'border-red-400'}
        />
      </div>

      {/* Revenue chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-neutral-800">
            {t('reports.dailyRevenue')} — {activePresetLabel}
          </h2>
          <div className="flex gap-3 text-xs text-neutral-500">
            {bestDay  && <span>🏆 {t('reports.best')}: {bestDay.date} ({bestDay.revenue.toLocaleString()} {t('common.currency')})</span>}
            {worstDay && days > 1 && <span>📉 {t('reports.lowest')}: {worstDay.date} ({worstDay.revenue.toLocaleString()} {t('common.currency')})</span>}
          </div>
        </div>
        {revData ? (
          <div>
            <div className="flex items-end gap-px" style={{ height: '120px' }}>
              {revData.map((d, i) => {
                const max = Math.max(...revData.map(x => x.revenue), 1);
                const h   = Math.max(2, Math.round((d.revenue / max) * 110));
                const isToday = d.date === format(new Date(), 'yyyy-MM-dd');
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-neutral-900 text-white
                                    text-xs rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100
                                    transition-opacity pointer-events-none z-10">
                      <p className="font-semibold">{d.revenue.toLocaleString()} {t('common.currency')}</p>
                      <p className="text-neutral-400">{d.date} · {d.orders} {t('reports.orders')}</p>
                    </div>
                    <div
                      className={`w-full rounded-t-sm transition-all ${isToday ? 'bg-accent-500' : 'bg-primary-500 hover:bg-primary-600'}`}
                      style={{ height: `${h}px` }}
                    />
                  </div>
                );
              })}
            </div>
            {days <= 31 && (
              <div className="flex mt-1.5">
                {revData.map((d, i) => (
                  <div key={i} className="flex-1 text-center">
                    {(i === 0 || i === Math.floor(revData.length/2) || i === revData.length - 1) && (
                      <span className="text-[9px] text-neutral-400">{d.date.slice(5)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-neutral-100">
              {[
                { label: t('analytics.totalRevenue'),  val: `${totalRevenue.toLocaleString()} ${t('common.currency')}` },
                { label: t('analytics.totalOrders'),   val: totalOrders },
                { label: t('reports.avgDay'),          val: `${avgDailyRev.toFixed(0)} ${t('common.currency')}` },
                { label: t('analytics.avgOrderValue'), val: `${avgOrderValue.toFixed(0)} ${t('common.currency')}` },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <p className="font-display font-bold text-lg text-neutral-900">{val}</p>
                  <p className="text-xs text-neutral-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="skeleton h-32 rounded-xl"/>
        )}
      </div>

      {/* Orders by status + Category revenue */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-semibold text-neutral-800 mb-4">{t('analytics.ordersByStatus')}</h3>
          {overview ? (
            <div className="space-y-3">
              {[
                { status: 'pending',    color: 'bg-yellow-400' },
                { status: 'confirmed',  color: 'bg-blue-400'   },
                { status: 'processing', color: 'bg-blue-500'   },
                { status: 'shipped',    color: 'bg-orange-400' },
                { status: 'delivered',  color: 'bg-primary-500'},
                { status: 'cancelled',  color: 'bg-red-400'    },
              ].map(({ status, color }) => {
                const count = overview.orders?.[status] || 0;
                const total = overview.orders?.total || 1;
                const pct   = Math.round((count / total) * 100);
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-neutral-700">{t(`orders.statuses.${status}`, status)}</span>
                      <span className="text-neutral-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="skeleton h-40 rounded-xl"/>}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-neutral-800 mb-4">{t('analytics.revenueByCategory')}</h3>
          {catData ? (
            <div className="space-y-3">
              {catData.slice(0, 7).map(cat => {
                const maxRev = Math.max(...catData.map(c => c.revenue), 1);
                const pct    = Math.round((cat.revenue / maxRev) * 100);
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-neutral-700 capitalize">{cat.category?.replace('-',' ')}</span>
                      <span className="text-neutral-500">{cat.revenue?.toLocaleString()} {t('common.currency')} · {cat.sold} {t('reports.sold')}</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="skeleton h-40 rounded-xl"/>}
        </div>
      </div>

      {/* Top Products */}
      <MiniTable
        title={t('admin.topProducts')}
        emptyMsg={t('reports.noSalesData')}
        columns={[
          { key: '_rank',    label: '#',                        render: (_, i) => i + 1 },
          { key: 'name',     label: t('common.name'),           render: p => (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                {p.image
                  ? <img src={`${URL_IMAGE}/api/images/${p.image}`} className="w-full h-full object-cover" alt={p.name}/>
                  : <span className="flex items-center justify-center h-full text-sm">💊</span>}
              </div>
              <span className="font-medium text-sm">{p.name}</span>
            </div>
          )},
          { key: 'category', label: t('reports.category'),     render: p => <span className="badge-gray capitalize text-xs">{p.category?.replace('-',' ')}</span> },
          { key: 'sold',     label: t('analytics.unitsSold'),  render: p => <span className="font-bold text-neutral-800">{p.sold}</span> },
          { key: 'revenue',  label: t('analytics.totalRevenue'), render: p => <span className="font-semibold text-primary-700">{p.revenue?.toLocaleString()} {t('common.currency')}</span> },
          { key: 'stock',    label: t('analytics.stockLeft'),  render: p => <span className={p.stock === 0 ? 'text-red-600 font-bold' : p.stock <= 10 ? 'text-yellow-600 font-bold' : 'text-neutral-700'}>{p.stock}</span> },
        ].map((c, i) => ({ ...c, render: c.render ? (row) => c.render(row, i) : undefined }))}
        rows={topProducts || []}
      />

      {/* Export Section */}
      <div className="card p-6">
        <div className="mb-5">
          <h2 className="font-display font-semibold text-xl text-neutral-900">📥 {t('reports.exportTitle')}</h2>
          <p className="text-neutral-500 text-sm mt-1">{t('reports.exportSubtitle')}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Orders */}
          <div className="p-4 border-2 border-neutral-100 rounded-2xl hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📦</span>
              <div>
                <p className="font-semibold text-neutral-800">{t('reports.exportCards.orders.title')}</p>
                <p className="text-xs text-neutral-400">{t('reports.exportCards.orders.sub')}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">{t('reports.exportCards.orders.desc')}</p>
            <ExportBtn label={t('reports.exportCards.orders.btn')} onClick={() => handleExport('orders')} loading={exporting.orders}/>
          </div>

          {/* Products */}
          <div className="p-4 border-2 border-neutral-100 rounded-2xl hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">💊</span>
              <div>
                <p className="font-semibold text-neutral-800">{t('reports.exportCards.products.title')}</p>
                <p className="text-xs text-neutral-400">{t('reports.exportCards.products.sub')}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">{t('reports.exportCards.products.desc')}</p>
            <ExportBtn label={t('reports.exportCards.products.btn')} onClick={() => handleExport('products')} loading={exporting.products}/>
          </div>

          {/* Inventory */}
          <div className="p-4 border-2 border-neutral-100 rounded-2xl hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🏪</span>
              <div>
                <p className="font-semibold text-neutral-800">{t('reports.exportCards.inventory.title')}</p>
                <p className="text-xs text-neutral-400">{t('reports.exportCards.inventory.sub')}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">{t('reports.exportCards.inventory.desc')}</p>
            <ExportBtn label={t('reports.exportCards.inventory.btn')} onClick={() => handleExport('inventory')} loading={exporting.inventory}/>
          </div>

          {/* Users */}
          <div className="p-4 border-2 border-neutral-100 rounded-2xl hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">👥</span>
              <div>
                <p className="font-semibold text-neutral-800">{t('reports.exportCards.users.title')}</p>
                <p className="text-xs text-neutral-400">{t('reports.exportCards.users.sub')}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">{t('reports.exportCards.users.desc')}</p>
            <ExportBtn label={t('reports.exportCards.users.btn')} onClick={() => handleExport('users')} loading={exporting.users}/>
          </div>

          {/* Appointments */}
          <div className="p-4 border-2 border-neutral-100 rounded-2xl hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📅</span>
              <div>
                <p className="font-semibold text-neutral-800">{t('reports.exportCards.appointments.title')}</p>
                <p className="text-xs text-neutral-400">{t('reports.exportCards.appointments.sub')}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">{t('reports.exportCards.appointments.desc')}</p>
            <ExportBtn label={t('reports.exportCards.appointments.btn')} onClick={() => handleExport('appointments')} loading={exporting.appointments}/>
          </div>

          {/* Returns */}
          <div className="p-4 border-2 border-neutral-100 rounded-2xl hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">↩️</span>
              <div>
                <p className="font-semibold text-neutral-800">{t('reports.exportCards.returns.title')}</p>
                <p className="text-xs text-neutral-400">{t('reports.exportCards.returns.sub')}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">{t('reports.exportCards.returns.desc')}</p>
            <ExportBtn label={t('reports.exportCards.returns.btn')} onClick={() => handleExport('returns')} loading={exporting.returns}/>
          </div>

          {/* Full report */}
          <div className="p-4 border-2 border-primary-200 bg-primary-50/30 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-semibold text-neutral-800">{t('reports.exportCards.full.title')}</p>
                <p className="text-xs text-primary-600 font-medium">{t('reports.exportCards.full.sub')}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">{t('reports.exportCards.full.desc')}</p>
            <button onClick={handleFullReport} disabled={exporting.full} className="btn-primary w-full justify-center">
              {exporting.full ? t('reports.generating') : `📊 ${t('reports.exportFullBtn')}`}
            </button>
          </div>
        </div>

        <div className="mt-5 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
          <p className="text-xs text-neutral-600">
            <strong>📌 {t('common.notes')}:</strong> {t('reports.exportNote')}
          </p>
        </div>
      </div>
    </div>
  );
}