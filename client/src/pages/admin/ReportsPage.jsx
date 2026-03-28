import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '@/api/analyticsAPI';
import { ordersAPI, productsAPI, authAPI, appointmentsAPI } from '@/api/services';
import {
  exportToExcel,
  ORDERS_COLUMNS, PRODUCTS_COLUMNS, USERS_COLUMNS,
  INVENTORY_COLUMNS, APPOINTMENTS_COLUMNS, REVENUE_COLUMNS,
  prepareInventoryData,
} from '@/utils/excelExport';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;


// ── Preset date ranges ─────────────────────────────────────────────────────
const PRESETS = [
  { label: 'Today',        from: format(new Date(), 'yyyy-MM-dd'),               to: format(new Date(), 'yyyy-MM-dd') },
  { label: 'Last 7 Days',  from: format(subDays(new Date(), 6), 'yyyy-MM-dd'),   to: format(new Date(), 'yyyy-MM-dd') },
  { label: 'Last 30 Days', from: format(subDays(new Date(), 29), 'yyyy-MM-dd'),  to: format(new Date(), 'yyyy-MM-dd') },
  { label: 'This Month',   from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') },
  { label: 'This Year',    from: format(startOfYear(new Date()), 'yyyy-MM-dd'),  to: format(new Date(), 'yyyy-MM-dd') },
  { label: 'All Time',     from: '2020-01-01',                                   to: format(new Date(), 'yyyy-MM-dd') },
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
function MiniTable({ title, columns, rows, emptyMsg = 'No data' }) {
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
function ExportBtn({ label, onClick, loading, icon = '📥' }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-neutral-200 bg-white
                 hover:border-primary-400 hover:bg-primary-50 text-sm font-medium text-neutral-700
                 hover:text-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
      {loading
        ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
        : <span>{icon}</span>
      }
      {label}
    </button>
  );
}

export default function ReportsPage() {
  const [dateRange,   setDateRange]  = useState({ from: PRESETS[2].from, to: PRESETS[2].to });
  const [activePreset,setActivePreset] = useState('Last 30 Days');
  const [exporting,  setExporting]   = useState({});

  const applyPreset = (preset) => {
    setActivePreset(preset.label);
    setDateRange({ from: preset.from, to: preset.to });
  };

  const days = Math.max(1, Math.round((new Date(dateRange.to) - new Date(dateRange.from)) / 86400000) + 1);

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: overview }    = useQuery({ queryKey: ['rep-overview'],         queryFn: () => analyticsAPI.getOverview().then(r => r.data.data) });
  const { data: revData }     = useQuery({ queryKey: ['rep-revenue', days],    queryFn: () => analyticsAPI.getRevenue({ days }).then(r => r.data.data) });
  const { data: topProducts } = useQuery({ queryKey: ['rep-top', dateRange],   queryFn: () => analyticsAPI.getTopProducts({ limit: 10 }).then(r => r.data.data) });
  const { data: catData }     = useQuery({ queryKey: ['rep-cats'],             queryFn: () => analyticsAPI.getCategories().then(r => r.data.data) });

  // ── Computed metrics ─────────────────────────────────────────────────────
  const totalRevenue  = revData?.reduce((s, d) => s + d.revenue, 0) || 0;
  const totalOrders   = revData?.reduce((s, d) => s + d.orders,  0) || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const avgDailyRev   = totalRevenue / days;

  const prevHalf  = revData?.slice(0, Math.floor(revData.length / 2)) || [];
  const currHalf  = revData?.slice(Math.floor(revData.length / 2))    || [];
  const prevRev   = prevHalf.reduce((s, d) => s + d.revenue, 0);
  const currRev   = currHalf.reduce((s, d) => s + d.revenue, 0);
  const revenueGrowth = prevRev > 0 ? (((currRev - prevRev) / prevRev) * 100).toFixed(1) : null;

  const bestDay   = revData?.reduce((best, d) => d.revenue > (best?.revenue || 0) ? d : best, null);
  const worstDay  = revData?.reduce((worst, d) => d.revenue < (worst?.revenue ?? Infinity) ? d : worst, null);

  // Status breakdown from overview
  const ordersByStatus = overview?.orders || {};

  // ── Export handlers ──────────────────────────────────────────────────────
  const handleExport = async (type) => {
    setExporting(e => ({ ...e, [type]: true }));
    try {
      const res = await analyticsAPI.exportExcel(type, { from: dateRange.from, to: dateRange.to });
      const raw = res.data.data || [];

      const sheetMap = {
        orders: {
          name: 'Orders',
          cols: ORDERS_COLUMNS,
          data: raw.map(o => ({
            ...o,
            createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : '—',
          })),
        },
        products: {
          name: 'Products',
          cols: PRODUCTS_COLUMNS,
          data: raw.map(p => ({
            ...p,
            createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—',
          })),
        },
        users: {
          name: 'Users',
          cols: USERS_COLUMNS,
          data: raw.map(u => ({
            ...u,
            createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : '—',
            lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-GB') : 'Never',
          })),
        },
        inventory: {
          name: 'Inventory',
          cols: INVENTORY_COLUMNS,
          data: prepareInventoryData(raw),
        },
        appointments: {
          name: 'Appointments',
          cols: APPOINTMENTS_COLUMNS,
          data: raw.map(a => ({
            ...a,
            createdAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB') : '—',
          })),
        },
      };

      const sheet = sheetMap[type];
      exportToExcel([{ name: sheet.name, columns: sheet.cols, data: sheet.data }], `pharmyclinic_${type}`);
      toast.success(`${sheet.name} exported to Excel ✓`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(e => ({ ...e, [type]: false }));
    }
  };

  // Full report: multiple sheets in one workbook
  const handleFullReport = async () => {
    setExporting(e => ({ ...e, full: true }));
    try {
      const [ordersRes, productsRes, usersRes, apptRes] = await Promise.all([
        analyticsAPI.exportExcel('orders',       { from: dateRange.from, to: dateRange.to }),
        analyticsAPI.exportExcel('products',     {}),
        analyticsAPI.exportExcel('users',        {}),
        analyticsAPI.exportExcel('appointments', { from: dateRange.from, to: dateRange.to }),
      ]);

      // Revenue summary sheet
      const revSummary = revData || [];

      exportToExcel([
        {
          name: 'Revenue Summary',
          columns: [
            ...REVENUE_COLUMNS,
            { header: 'Avg Order (EGP)', key: '_avg', width: 16 },
          ],
          data: revSummary.map(d => ({
            ...d,
            _avg: d.orders > 0 ? (d.revenue / d.orders).toFixed(2) : 0,
          })),
        },
        {
          name: 'Orders',
          columns: ORDERS_COLUMNS,
          data: (ordersRes.data.data || []).map(o => ({
            ...o,
            createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : '—',
          })),
        },
        {
          name: 'Products',
          columns: PRODUCTS_COLUMNS,
          data: (productsRes.data.data || []).map(p => ({
            ...p,
            createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—',
          })),
        },
        {
          name: 'Patients',
          columns: USERS_COLUMNS,
          data: (usersRes.data.data || []).map(u => ({
            ...u,
            createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : '—',
            lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-GB') : 'Never',
          })),
        },
        {
          name: 'Appointments',
          columns: APPOINTMENTS_COLUMNS,
          data: (apptRes.data.data || []).map(a => ({
            ...a,
            createdAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB') : '—',
          })),
        },
        {
          name: 'Category Breakdown',
          columns: [
            { header: 'Category',    key: 'category', width: 20 },
            { header: 'Products',    key: 'products', width: 12 },
            { header: 'Total Stock', key: 'totalStock', width: 14 },
            { header: 'Avg Price (EGP)', key: 'avgPrice', width: 16 },
            { header: 'Units Sold',  key: 'sold',     width: 12 },
            { header: 'Revenue (EGP)', key: 'revenue', width: 16 },
          ],
          data: catData || [],
        },
      ], 'pharmyclinic_full_report');

      toast.success('Full report exported ✓');
    } catch (err) {
      toast.error('Full report export failed');
    } finally {
      setExporting(e => ({ ...e, full: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Reports</h1>
          <p className="text-neutral-500 text-sm mt-1">Revenue analysis, growth metrics & data exports</p>
        </div>
        <button onClick={handleFullReport} disabled={exporting.full}
          className="btn-primary">
          {exporting.full
            ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg> Generating…</>
            : <> 📊 Export Full Report (Excel)</>
          }
        </button>
      </div>

      {/* Date range selector */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-neutral-700 shrink-0">📅 Period:</p>
          {/* Preset buttons */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activePreset === p.label
                    ? 'bg-primary-600 text-white shadow-green'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          {/* Custom range */}
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs text-neutral-500">From:</label>
            <input type="date" className="input text-sm w-36"
              value={dateRange.from}
              onChange={e => { setActivePreset('Custom'); setDateRange(r => ({ ...r, from: e.target.value })); }}
            />
            <label className="text-xs text-neutral-500">To:</label>
            <input type="date" className="input text-sm w-36"
              value={dateRange.to}
              onChange={e => { setActivePreset('Custom'); setDateRange(r => ({ ...r, to: e.target.value })); }}
            />
          </div>
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          Showing data for <strong className="text-neutral-600">{days} day{days !== 1 ? 's' : ''}</strong>
          : {dateRange.from} → {dateRange.to}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue"
          value={`${totalRevenue.toLocaleString('en-EG')} EGP`}
          sub={`Avg ${avgDailyRev.toFixed(0)} EGP/day`}
          icon="💰" color="border-primary-500"
          trend={revenueGrowth}
          trendLabel={revenueGrowth ? `vs prev ${Math.floor(days/2)}d` : null}
        />
        <KpiCard
          title="Total Orders"
          value={totalOrders.toLocaleString()}
          sub={`${(totalOrders / days).toFixed(1)} orders/day avg`}
          icon="📦" color="border-blue-500"
        />
        <KpiCard
          title="Avg Order Value"
          value={`${avgOrderValue.toFixed(2)} EGP`}
          sub={`From ${totalOrders} orders`}
          icon="🧾" color="border-purple-500"
        />
        <KpiCard
          title="Revenue Growth"
          value={revenueGrowth !== null ? `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}%` : 'N/A'}
          sub={`First half vs second half`}
          icon={revenueGrowth >= 0 ? '📈' : '📉'}
          color={revenueGrowth >= 0 ? 'border-primary-500' : 'border-red-400'}
        />
      </div>

      {/* Revenue chart (bar) */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-neutral-800">Daily Revenue — {activePreset}</h2>
          <div className="flex gap-3 text-xs text-neutral-500">
            {bestDay  && <span>🏆 Best: {bestDay.date} ({bestDay.revenue.toLocaleString()} EGP)</span>}
            {worstDay && days > 1 && <span>📉 Lowest: {worstDay.date} ({worstDay.revenue.toLocaleString()} EGP)</span>}
          </div>
        </div>
        {revData ? (
          <div>
            {/* Bar chart */}
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
                      <p className="font-semibold">{d.revenue.toLocaleString()} EGP</p>
                      <p className="text-neutral-400">{d.date} · {d.orders} orders</p>
                    </div>
                    <div
                      className={`w-full rounded-t-sm transition-all ${isToday ? 'bg-accent-500' : 'bg-primary-500 hover:bg-primary-600'}`}
                      style={{ height: `${h}px` }}
                    />
                  </div>
                );
              })}
            </div>
            {/* X-axis labels */}
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
            {/* Summary row */}
            <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-neutral-100">
              {[
                { label: 'Total Revenue',  val: `${totalRevenue.toLocaleString()} EGP` },
                { label: 'Total Orders',   val: totalOrders },
                { label: 'Avg/Day',        val: `${avgDailyRev.toFixed(0)} EGP` },
                { label: 'Avg Order',      val: `${avgOrderValue.toFixed(0)} EGP` },
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
        {/* Orders status breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-neutral-800 mb-4">Orders Status Breakdown</h3>
          {overview ? (
            <div className="space-y-3">
              {[
                { status: 'pending',    color: 'bg-yellow-400', label: 'Pending' },
                { status: 'confirmed',  color: 'bg-blue-400',   label: 'Confirmed' },
                { status: 'processing', color: 'bg-blue-500',   label: 'Processing' },
                { status: 'shipped',    color: 'bg-orange-400', label: 'Shipped' },
                { status: 'delivered',  color: 'bg-primary-500',label: 'Delivered' },
                { status: 'cancelled',  color: 'bg-red-400',    label: 'Cancelled' },
              ].map(({ status, color, label }) => {
                const count = overview.orders?.[status] || 0;
                const total = overview.orders?.total || 1;
                const pct   = Math.round((count / total) * 100);
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-neutral-700">{label}</span>
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

        {/* Category revenue */}
        <div className="card p-5">
          <h3 className="font-semibold text-neutral-800 mb-4">Revenue by Category</h3>
          {catData ? (
            <div className="space-y-3">
              {catData.slice(0, 7).map(cat => {
                const maxRev = Math.max(...catData.map(c => c.revenue), 1);
                const pct    = Math.round((cat.revenue / maxRev) * 100);
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-neutral-700 capitalize">{cat.category?.replace('-',' ')}</span>
                      <span className="text-neutral-500">{cat.revenue?.toLocaleString()} EGP · {cat.sold} sold</span>
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

      {/* Top Products in period */}
      <MiniTable
        title="Top Selling Products"
        columns={[
          { key: '_rank',    label: '#',        render: (_, i) => i + 1 },
          { key: 'name',     label: 'Product',  render: p => (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                {p.image ? <img src={`${URL_IMAGE}/api/images/${p.image}`} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full text-sm">💊</span>}
              </div>
              <span className="font-medium text-sm">{p.name}</span>
            </div>
          )},
          { key: 'category', label: 'Category', render: p => <span className="badge-gray capitalize text-xs">{p.category?.replace('-',' ')}</span> },
          { key: 'sold',     label: 'Sold',     render: p => <span className="font-bold text-neutral-800">{p.sold}</span> },
          { key: 'revenue',  label: 'Revenue',  render: p => <span className="font-semibold text-primary-700">{p.revenue?.toLocaleString()} EGP</span> },
          { key: 'stock',    label: 'Stock',    render: p => <span className={p.stock === 0 ? 'text-red-600 font-bold' : p.stock <= 10 ? 'text-yellow-600 font-bold' : 'text-neutral-700'}>{p.stock}</span> },
        ].map((c, i) => ({ ...c, render: c.render ? (row) => c.render(row, i) : undefined }))}
        rows={topProducts || []}
        emptyMsg="No sales data yet"
      />

      {/* ── Export Section ────────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="mb-5">
          <h2 className="font-display font-semibold text-xl text-neutral-900">📥 Export Data to Excel</h2>
          <p className="text-neutral-500 text-sm mt-1">
            Download individual datasets or the full report as .xlsx files.
            Date-filtered exports use the period selected above.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Orders export */}
          <div className="p-4 border-2 border-neutral-100 rounded-2xl hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📦</span>
              <div>
                <p className="font-semibold text-neutral-800">Orders Report</p>
                <p className="text-xs text-neutral-400">Filtered by date range</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Includes: order number, customer, items count, totals, payment, status, address, date
            </p>
            <ExportBtn label="Export Orders" onClick={() => handleExport('orders')} loading={exporting.orders}/>
          </div>

          {/* Products export */}
          <div className="p-4 border-2 border-neutral-100 rounded-2xl hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">💊</span>
              <div>
                <p className="font-semibold text-neutral-800">Products Catalog</p>
                <p className="text-xs text-neutral-400">All products</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Includes: name, category, SKU, price, compare price, stock, featured, status
            </p>
            <ExportBtn label="Export Products" onClick={() => handleExport('products')} loading={exporting.products}/>
          </div>

          {/* Inventory export */}
          <div className="p-4 border-2 border-neutral-100 rounded-2xl hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🏪</span>
              <div>
                <p className="font-semibold text-neutral-800">Inventory Report</p>
                <p className="text-xs text-neutral-400">Low stock & out of stock</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Includes: name, category, SKU, price, current stock, stock status
            </p>
            <ExportBtn label="Export Inventory" onClick={() => handleExport('inventory')} loading={exporting.inventory}/>
          </div>

          {/* Users export */}
          <div className="p-4 border-2 border-neutral-100 rounded-2xl hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">👥</span>
              <div>
                <p className="font-semibold text-neutral-800">Patients List</p>
                <p className="text-xs text-neutral-400">All registered patients</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Includes: name, email, phone, city, role, status, join date, last login
            </p>
            <ExportBtn label="Export Patients" onClick={() => handleExport('users')} loading={exporting.users}/>
          </div>

          {/* Appointments export */}
          <div className="p-4 border-2 border-neutral-100 rounded-2xl hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📅</span>
              <div>
                <p className="font-semibold text-neutral-800">Appointments Report</p>
                <p className="text-xs text-neutral-400">Filtered by date range</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Includes: patient, doctor, service, date, time, status, notes, booking date
            </p>
            <ExportBtn label="Export Appointments" onClick={() => handleExport('appointments')} loading={exporting.appointments}/>
          </div>

          {/* Returns export */}
          <div className="p-4 border-2 border-neutral-100 rounded-2xl hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">↩️</span>
              <div>
                <p className="font-semibold text-neutral-800">تقرير المرتجعات</p>
                <p className="text-xs text-neutral-400">مفلتر بالتاريخ</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              يشمل: رقم الإرجاع، العميل، الطلب، المنتجات، مبلغ الاسترداد، الحالة
            </p>
            <ExportBtn label="تصدير المرتجعات" onClick={() => handleExport('returns')} loading={exporting.returns}/>
          </div>

          {/* Full report */}
          <div className="p-4 border-2 border-primary-200 bg-primary-50/30 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-semibold text-neutral-800">Full Pharmacy Report</p>
                <p className="text-xs text-primary-600 font-medium">6 sheets in one file</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Revenue Summary + Orders + Products + Patients + Appointments + Category Breakdown
            </p>
            <button onClick={handleFullReport} disabled={exporting.full}
              className="btn-primary w-full justify-center">
              {exporting.full ? 'Generating…' : '📊 Export Full Report'}
            </button>
          </div>
        </div>

        {/* Info note */}
        <div className="mt-5 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
          <p className="text-xs text-neutral-600">
            <strong>📌 Note:</strong> Files open directly in Microsoft Excel, Google Sheets, or LibreOffice Calc.
            Date-filtered exports (Orders & Appointments) use the period selected above.
            Products, Patients, and Inventory always export all records.
          </p>
        </div>
      </div>
    </div>
  );
}
