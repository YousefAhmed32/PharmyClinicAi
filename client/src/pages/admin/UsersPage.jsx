import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebouncedCallback } from '@/hooks/useCommon';
import { authAPI } from '@/api/services';
import api from '@/api/axios';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// ── Order status badge ────────────────────────────────────────────────────
const ORDER_STATUS_COLORS = {
  delivered:'badge-green', confirmed:'badge-green', processing:'badge-blue',
  out_for_delivery:'badge-orange', pending:'badge-yellow', cancelled:'badge-red',
  rejected:'badge-red', returned:'badge-gray', refunded:'badge-gray',
};

// ── Message bubble (mini) ─────────────────────────────────────────────────
function MiniMessage({ msg }) {
  const isAi = msg.senderRole === 'ai';
  const isAdmin = msg.senderRole === 'admin';
  return (
    <div className={`flex mb-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      <div className={`px-3 py-1.5 rounded-xl text-xs max-w-[80%] ${
        isAdmin ? 'bg-primary-600 text-white' :
        isAi    ? 'bg-purple-50 text-purple-800 border border-purple-100' :
                  'bg-white border border-neutral-200 text-neutral-700'
      }`}>
        {msg.content?.slice(0, 120)}{msg.content?.length > 120 ? '…' : ''}
      </div>
    </div>
  );
}

// ── Deep Profile Modal ────────────────────────────────────────────────────
function UserDeepModal({ userId, onClose }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('info');

  const { data, isLoading } = useQuery({
    queryKey: ['user-deep', userId],
    queryFn:  () => api.get(`/auth/users/${userId}/profile`).then(r => r.data.data),
  });

  const qc = useQueryClient();
  const toggleActive = useMutation({
    mutationFn: () => api.patch(`/auth/users/${userId}/toggle-active`),
    onSuccess: () => {
      toast.success('User status updated');
      qc.invalidateQueries(['user-deep', userId]);
      qc.invalidateQueries(['admin-users']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const TABS = [
    { id:'info',    label:'👤 Info' },
    { id:'orders',  label:'📦 Orders' },
    { id:'returns', label:'↩️ Returns' },
    { id:'support', label:'💬 Support' },
    { id:'ai',      label:'🤖 AI Chat' },
  ];

  if (isLoading || !data) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose}/>
      <div className="relative z-50 bg-white rounded-2xl p-8 w-full max-w-3xl animate-scale-in">
        <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
      </div>
    </div>
  );

  const { user, stats, orders, returns, chats } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose}/>
      <div className="relative z-50 bg-white rounded-2xl shadow-lifted w-full max-w-3xl
                      max-h-[92vh] flex flex-col animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center
                            text-xl font-bold text-primary-700">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-lg">{user.name}</h2>
              <p className="text-sm text-neutral-500">{user.email}</p>
            </div>
            <span className={user.role === 'admin' ? 'badge-orange' : 'badge-blue'}>{user.role}</span>
            <span className={user.isActive ? 'badge-green' : 'badge-red'}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleActive.mutate()}
              disabled={toggleActive.isPending}
              className={`btn-sm text-xs ${user.isActive ? 'btn-ghost text-red-500' : 'btn-secondary'}`}>
              {user.isActive ? '🚫 Deactivate' : '✅ Activate'}
            </button>
            <button onClick={onClose} className="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3 bg-neutral-50 border-b border-neutral-100 shrink-0">
          {[
            { label:'Total Orders',    val: stats.totalOrders },
            { label:'Total Spending',  val: `${stats.totalSpending.toLocaleString()} EGP` },
            { label:'Returns',         val: stats.totalReturns },
            { label:'Chat Messages',   val: stats.totalMessages },
          ].map(({ label, val }) => (
            <div key={label} className="text-center">
              <p className="font-bold text-neutral-900">{val}</p>
              <p className="text-xs text-neutral-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 px-6 shrink-0 overflow-x-auto">
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px
                ${tab === tb.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* INFO */}
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Phone',         user.phone         || '—'],
                  ['Language',      user.language      || 'ar'],
                  ['Joined',        format(new Date(user.createdAt), 'dd MMM yyyy')],
                  ['Last Login',    user.lastLogin     ? format(new Date(user.lastLogin),    'dd MMM yyyy HH:mm') : 'Never'],
                  ['Last Activity', user.lastActivity  ? format(new Date(user.lastActivity), 'dd MMM yyyy HH:mm') : 'Never'],
                  ['City',          user.address?.city || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="p-3 bg-neutral-50 rounded-xl">
                    <p className="text-xs text-neutral-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-neutral-800">{val}</p>
                  </div>
                ))}
              </div>
              {user.address?.street && (
                <div className="p-3 bg-neutral-50 rounded-xl">
                  <p className="text-xs text-neutral-400 mb-0.5">Address</p>
                  <p className="text-sm text-neutral-700">
                    {user.address.street}, {user.address.city},
                    {user.address.state} {user.address.zip}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ORDERS */}
          {tab === 'orders' && (
            <div className="space-y-2">
              {orders.length === 0 ? (
                <p className="text-neutral-400 text-sm text-center py-8">No orders</p>
              ) : orders.map(o => (
                <div key={o._id} className="flex items-center justify-between p-3
                                            bg-neutral-50 rounded-xl border border-neutral-200">
                  <div>
                    <p className="font-mono text-sm font-semibold text-primary-700">{o.orderNumber}</p>
                    <p className="text-xs text-neutral-500">
                      {o.items?.length} items · {format(new Date(o.createdAt), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`${ORDER_STATUS_COLORS[o.status] || 'badge-gray'} text-xs`}>
                      {o.status}
                    </span>
                    <span className="font-bold text-sm text-neutral-800">
                      {o.total?.toFixed(2)} EGP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* RETURNS */}
          {tab === 'returns' && (
            <div className="space-y-2">
              {returns.length === 0 ? (
                <p className="text-neutral-400 text-sm text-center py-8">No returns</p>
              ) : returns.map(r => (
                <div key={r._id} className="flex items-center justify-between p-3
                                            bg-neutral-50 rounded-xl border border-neutral-200">
                  <div>
                    <p className="font-mono text-sm font-semibold text-primary-700">{r.returnNumber}</p>
                    <p className="text-xs text-neutral-500">
                      {r.items?.length} item(s) · {format(new Date(r.createdAt), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge-gray text-xs">{r.status}</span>
                    {r.refundAmount > 0 && (
                      <span className="text-xs font-semibold text-primary-700">
                        {r.refundAmount.toFixed(2)} EGP
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SUPPORT CHAT */}
          {tab === 'support' && (
            <div>
              {chats.support?.length === 0 ? (
                <p className="text-neutral-400 text-sm text-center py-8">No support messages</p>
              ) : (
                <div className="space-y-0.5">
                  {chats.support.map((msg, i) => <MiniMessage key={msg._id || i} msg={msg}/>)}
                </div>
              )}
            </div>
          )}

          {/* AI CHAT */}
          {tab === 'ai' && (
            <div>
              {chats.ai?.length === 0 ? (
                <p className="text-neutral-400 text-sm text-center py-8">No AI chat history</p>
              ) : (
                <div className="space-y-0.5">
                  {chats.ai.map((msg, i) => <MiniMessage key={msg._id || i} msg={msg}/>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Users Page ───────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { t } = useTranslation();
  const qc    = useQueryClient();
  const [page,      setPage]      = useState(1);
  const [selected,  setSelected]  = useState(null);
  const [searchVal, setSearchVal] = useState('');
  const [search,    setSearch]    = useState('');
  const [roleFilter,setRoleFilter]= useState('patient');

  const debouncedSearch = useDebouncedCallback((v) => {
    setSearch(v); setPage(1);
  }, 350);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter],
    queryFn:  () => authAPI.getAllUsers({
      page, limit:12,
      ...(search     && { search }),
      ...(roleFilter && { role: roleFilter }),
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const users = data?.data || [];
  const meta  = data?.meta || {};

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">{t('admin.users')}</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{meta.total || 0} users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input pl-9 text-sm"
            placeholder="Search name or email…"
            value={searchVal}
            onChange={e => { setSearchVal(e.target.value); debouncedSearch(e.target.value); }}/>
        </div>
        <div className="flex gap-1">
          {[['patient','Patients'],['admin','Admins'],['','All']].map(([v,l]) => (
            <button key={v} onClick={() => { setRoleFilter(v); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all
                ${roleFilter === v
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary-300'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={`card transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_,i) => <div key={i} className="skeleton h-14 rounded-xl"/>)}
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-semibold text-neutral-700">No users found</p>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th><th>Role</th><th>Phone</th>
                  <th>Joined</th><th>Last Login</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center
                                        text-sm font-bold text-primary-700 shrink-0">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-800">{u.name}</p>
                          <p className="text-xs text-neutral-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={u.role === 'admin' ? 'badge-orange' : 'badge-blue'}>
                        {u.role}
                      </span>
                    </td>
                    <td className="text-sm text-neutral-600">{u.phone || '—'}</td>
                    <td className="text-xs text-neutral-500">
                      {format(new Date(u.createdAt), 'dd MMM yyyy')}
                    </td>
                    <td className="text-xs text-neutral-500">
                      {u.lastLogin ? format(new Date(u.lastLogin), 'dd MMM yyyy') : 'Never'}
                    </td>
                    <td>
                      <span className={u.isActive ? 'badge-green' : 'badge-red'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => setSelected(u._id)}
                        className="btn-secondary btn-sm">
                        👤 View
                      </button>
                    </td>
                  </tr>
                ))}
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
              {[...Array(Math.min(meta.totalPages,7))].map((_,i)=>(
                <button key={i+1} onClick={()=>setPage(i+1)}
                  className={`w-8 h-8 rounded-lg text-sm ${meta.page===i+1
                    ? 'bg-primary-600 text-white':'hover:bg-neutral-100'}`}>
                  {i+1}
                </button>
              ))}
              <button disabled={meta.page>=meta.totalPages} onClick={()=>setPage(p=>p+1)}
                className="btn-ghost btn-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <UserDeepModal userId={selected} onClose={() => setSelected(null)}/>
      )}
    </div>
  );
}
