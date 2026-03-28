import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebouncedCallback } from '@/hooks/useCommon';
import api from '@/api/axios';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;

const THRESHOLD_OPTIONS = [5, 10, 20, 50];

function StockBadge({ stock }) {
  if (stock === 0)  return <span className="badge-red font-bold">نفد ❌</span>;
  if (stock <= 5)   return <span className="badge-red">حرج: {stock}</span>;
  if (stock <= 10)  return <span className="badge-yellow">منخفض: {stock}</span>;
  if (stock <= 20)  return <span className="badge-orange">قليل: {stock}</span>;
  return <span className="badge-green">{stock} ✓</span>;
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const [threshold, setThreshold]     = useState(10);
  const [search,    setSearch]        = useState('');
  const [editId,    setEditId]        = useState(null);
  const [editStock, setEditStock]     = useState('');
  const [page,      setPage]          = useState(1);

  const debouncedSearch = useDebouncedCallback((v) => {
    setPage(1); setSearch(v);
  }, 350);
  const [searchVal, setSearchVal] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-inventory', threshold, page, search],
    queryFn:  () => api.get('/analytics/inventory', {
      params: { threshold, page, limit: 15, ...(search && { search }) }
    }).then(r => r.data.data),
    keepPreviousData: true,
  });

  const updateStock = useMutation({
    mutationFn: ({ id, stock }) => api.put(`/products/${id}`, { stock: Number(stock) },
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
    onSuccess: () => {
      toast.success('تم تحديث المخزون ✓');
      qc.invalidateQueries(['admin-inventory']);
      setEditId(null);
      setEditStock('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'فشل التحديث'),
  });

  const products   = data?.products || [];
  const outOfStock = data?.outOfStock || 0;
  const lowStock   = data?.lowStock   || 0;
  const total      = data?.total      || 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">إدارة المخزون</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            تتبع وتحديث مستويات المخزون
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card p-4 bg-red-50 border-l-4 border-red-500">
          <p className="font-bold text-2xl text-red-700">{outOfStock}</p>
          <p className="text-xs text-red-500 mt-1">نفد المخزون ❌</p>
        </div>
        <div className="card p-4 bg-yellow-50 border-l-4 border-yellow-400">
          <p className="font-bold text-2xl text-yellow-700">{lowStock}</p>
          <p className="text-xs text-yellow-500 mt-1">مخزون منخفض ⚠️</p>
        </div>
        <div className="card p-4 bg-neutral-50 border-l-4 border-neutral-300">
          <p className="font-bold text-2xl text-neutral-700">{total}</p>
          <p className="text-xs text-neutral-500 mt-1">تحت الحد المحدد</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="14" height="14"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input pl-9 text-sm" placeholder="بحث بالاسم أو الباركود..."
            value={searchVal}
            onChange={e => { setSearchVal(e.target.value); debouncedSearch(e.target.value); }}/>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-600 whitespace-nowrap">الحد:</label>
          <select className="input w-24 text-sm" value={threshold}
            onChange={e => { setThreshold(Number(e.target.value)); setPage(1); }}>
            {THRESHOLD_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={`card transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
        {isLoading ? (
          <div className="p-6 space-y-2">
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl"/>)}
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-semibold text-neutral-700">
              {search ? 'لا توجد نتائج' : `كل المنتجات فوق الحد (${threshold})`}
            </p>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الفئة</th>
                  <th>SKU / باركود</th>
                  <th>السعر</th>
                  <th>المخزون</th>
                  <th>تحديث المخزون</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                          {p.image
                            ? <img
                            src={`${URL_IMAGE}/api/images/${p.image}`}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => (e.target.src = "/placeholder.png")}
                          />
                            : <div className="w-full h-full flex items-center justify-center">💊</div>
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-800 max-w-[160px] truncate">{p.name}</p>
                          {p.genericName && (
                            <p className="text-xs text-neutral-400">{p.genericName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge-gray text-xs capitalize">
                        {p.category?.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-neutral-500">
                      {p.sku && <span>{p.sku}</span>}
                      {p.sku && p.barcode && <span className="mx-1">·</span>}
                      {p.barcode && <span>{p.barcode}</span>}
                      {!p.sku && !p.barcode && <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="font-semibold text-neutral-800">{p.price} EGP</td>
                    <td><StockBadge stock={p.stock}/></td>
                    <td>
                      {editId === p._id ? (
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" max="99999"
                            className="input w-20 text-sm text-center py-1.5"
                            value={editStock}
                            onChange={e => setEditStock(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') updateStock.mutate({ id: p._id, stock: editStock });
                              if (e.key === 'Escape') { setEditId(null); setEditStock(''); }
                            }}
                            autoFocus/>
                          <button
                            onClick={() => updateStock.mutate({ id: p._id, stock: editStock })}
                            disabled={updateStock.isPending}
                            className="btn-primary btn-sm py-1.5">
                            {updateStock.isPending ? '...' : '✓'}
                          </button>
                          <button
                            onClick={() => { setEditId(null); setEditStock(''); }}
                            className="btn-ghost btn-sm py-1.5">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditId(p._id); setEditStock(String(p.stock)); }}
                          className="btn-secondary btn-sm">
                          ✏️ تعديل
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">
              {((page - 1) * 15) + 1}–{Math.min(page * 15, total)} من {total}
            </p>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="btn-ghost btn-sm disabled:opacity-40">← السابق</button>
              <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
                className="btn-ghost btn-sm disabled:opacity-40">التالي →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
