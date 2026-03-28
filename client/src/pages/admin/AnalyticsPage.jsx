import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '@/api/analyticsAPI';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;

// ── Simple bar chart with labels ─────────────────────────────────────────
function BarChart({ data = [], valueKey = 'revenue', labelKey = 'date', color = 'bg-primary-500', height = 120, formatVal }) {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const fmt = formatVal || (v => v);
  return (
    <div className="relative" style={{ height: `${height + 30}px` }}>
      <div className="flex items-end gap-1 h-full pb-6">
        {data.map((d, i) => {
          const val = d[valueKey] || 0;
          const h   = Math.max(2, Math.round((val / max) * height));
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <p className="font-mono">{fmt(val)}</p>
                <p className="text-neutral-400 text-[10px]">{d[labelKey]}</p>
              </div>
              <div className={`w-full ${color} rounded-t-sm transition-all hover:opacity-90`} style={{ height: `${h}px` }}/>
              {data.length <= 15 && (
                <span className="text-[9px] text-neutral-400 w-full text-center truncate absolute -bottom-5">
                  {String(d[labelKey]).slice(-5)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Donut segment (CSS only) ──────────────────────────────────────────────
function DonutChart({ data = [] }) {
  const total  = data.reduce((s, d) => s + d.value, 0) || 1;
  const COLORS  = ['#339966','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
  let   offset  = 0;
  const radius  = 45;
  const circ    = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-6">
      <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f0f2f0" strokeWidth="14"/>
        {data.map((d, i) => {
          const pct  = d.value / total;
          const dash = pct * circ;
          const gap  = circ - dash;
          const el   = (
            <circle key={i} cx="60" cy="60" r={radius}
              fill="none" stroke={COLORS[i % COLORS.length]}
              strokeWidth="14" strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ} strokeLinecap="butt"
            />
          );
          offset += pct;
          return el;
        })}
      </svg>
      <div className="space-y-1.5 flex-1">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }}/>
              <span className="text-xs text-neutral-700 capitalize">{d.label?.replace('-',' ')}</span>
            </div>
            <span className="text-xs font-semibold text-neutral-800">{Math.round((d.value/total)*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: overview }    = useQuery({ queryKey:['analytics-overview'],    queryFn: ()=> analyticsAPI.getOverview().then(r=>r.data.data) });
  const { data: revenue }     = useQuery({ queryKey:['analytics-revenue',days], queryFn: ()=> analyticsAPI.getRevenue({ days }).then(r=>r.data.data) });
  const { data: ordersTrend } = useQuery({ queryKey:['analytics-orders',days],  queryFn: ()=> analyticsAPI.getOrdersTrend({ days }).then(r=>r.data.data) });
  const { data: topProducts } = useQuery({ queryKey:['analytics-top',10],       queryFn: ()=> analyticsAPI.getTopProducts({ limit:10 }).then(r=>r.data.data) });
  const { data: categories }  = useQuery({ queryKey:['analytics-cats'],          queryFn: ()=> analyticsAPI.getCategories().then(r=>r.data.data) });

  const totalRevenue  = revenue?.reduce((s,d)=>s+d.revenue,0)  || 0;
  const totalOrders   = revenue?.reduce((s,d)=>s+d.orders,0)   || 0;
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

  const statusDonut = ordersTrend?.byStatus
    ? Object.entries(ordersTrend.byStatus).map(([k,v])=>({ label:k, value:v }))
    : [];

  const catDonut = categories
    ? categories.map(c => ({ label: c.category, value: c.revenue }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Analytics</h1>
          <p className="text-neutral-500 text-sm mt-1">Deep insights into your pharmacy performance</p>
        </div>
        {/* Period selector */}
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl">
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${days === d ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Revenue',   val: `${totalRevenue.toLocaleString()} EGP`,           icon:'💰', color:'bg-primary-50 text-primary-700' },
          { label:'Total Orders',    val: totalOrders,                                        icon:'📦', color:'bg-blue-50 text-blue-700' },
          { label:'Avg Order Value', val: `${avgOrderValue.toFixed(0)} EGP`,                 icon:'📊', color:'bg-purple-50 text-purple-700' },
          { label:'Total Patients',  val: overview?.users.total || '—',                       icon:'👥', color:'bg-orange-50 text-orange-700' },
        ].map(({ label, val, icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`inline-flex w-10 h-10 rounded-xl ${color} items-center justify-center text-xl mb-3`}>{icon}</div>
            <p className="font-display font-bold text-xl text-neutral-900">{val}</p>
            <p className="text-xs text-neutral-500 mt-1">{label} — last {days} days</p>
          </div>
        ))}
      </div>

      {/* Revenue Bar Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-neutral-800">Revenue Trend — Last {days} Days</h2>
          <p className="text-sm text-neutral-500">{totalRevenue.toLocaleString()} EGP total</p>
        </div>
        {revenue
          ? <BarChart data={revenue} valueKey="revenue" labelKey="date" color="bg-primary-500" height={140} formatVal={v=>`${v.toLocaleString()} EGP`}/>
          : <div className="skeleton h-40 rounded-xl"/>
        }
      </div>

      {/* Orders Trend */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-neutral-800">Orders per Day — Last {days} Days</h2>
          <p className="text-sm text-neutral-500">{totalOrders} total orders</p>
        </div>
        {ordersTrend?.byDay
          ? <BarChart data={ordersTrend.byDay} valueKey="count" labelKey="_id" color="bg-blue-400" height={100} formatVal={v=>`${v} orders`}/>
          : <div className="skeleton h-32 rounded-xl"/>
        }
      </div>

      {/* Donut Charts */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="card p-6">
          <h2 className="font-semibold text-neutral-800 mb-5">Orders by Status</h2>
          {statusDonut.length > 0
            ? <DonutChart data={statusDonut}/>
            : <div className="skeleton h-28 rounded-xl"/>
          }
        </div>
        <div className="card p-6">
          <h2 className="font-semibold text-neutral-800 mb-5">Revenue by Category</h2>
          {catDonut.length > 0
            ? <DonutChart data={catDonut}/>
            : <div className="skeleton h-28 rounded-xl"/>
          }
        </div>
      </div>

      {/* Top Products Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-800">Top 10 Products by Sales</h2>
        </div>
        <div className="table-wrapper rounded-none border-0">
          <table className="table">
            <thead>
              <tr><th>#</th><th>Product</th><th>Category</th><th>Units Sold</th><th>Revenue</th><th>Stock Left</th></tr>
            </thead>
            <tbody>
              {(topProducts || []).map((p, i) => (
                <tr key={p._id}>
                  <td className="font-bold text-neutral-400">{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                        {p.image ? <img src={`${URL_IMAGE}/api/images/${p.image}`} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-sm">💊</div>}
                      </div>
                      <span className="font-medium text-sm text-neutral-800 line-clamp-1 max-w-[180px]">{p.name}</span>
                    </div>
                  </td>
                  <td><span className="badge-gray capitalize text-xs">{p.category?.replace('-',' ')}</span></td>
                  <td><span className="font-semibold text-neutral-800">{p.sold}</span></td>
                  <td><span className="font-semibold text-primary-700">{p.revenue?.toLocaleString()} EGP</span></td>
                  <td>
                    <span className={`font-medium text-sm ${p.stock === 0 ? 'text-red-600' : p.stock <= 10 ? 'text-yellow-600' : 'text-primary-600'}`}>
                      {p.stock ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Categories Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-800">Category Performance</h2>
        </div>
        <div className="table-wrapper rounded-none border-0">
          <table className="table">
            <thead>
              <tr><th>Category</th><th>Products</th><th>Total Stock</th><th>Avg Price</th><th>Units Sold</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {(categories || []).map(cat => (
                <tr key={cat.category}>
                  <td><span className="badge-gray capitalize">{cat.category?.replace('-',' ')}</span></td>
                  <td>{cat.products}</td>
                  <td>{cat.totalStock}</td>
                  <td>{cat.avgPrice} EGP</td>
                  <td>{cat.sold}</td>
                  <td className="font-semibold text-primary-700">{cat.revenue?.toLocaleString()} EGP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
