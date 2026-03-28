import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsAPI } from '@/api/services';
import BarcodeDisplay from '@/components/ui/BarcodeDisplay';

const PRINT_CSS = `
@media print {
  body > * { display: none !important; }
  #barcode-print-root { display: block !important; }
  #barcode-print-root { position: fixed; inset: 0; }
  #no-print { display: none !important; }
  @page { size: A4; margin: 10mm; }
  .barcode-cell { page-break-inside: avoid; }
}
`;

// ── Single barcode label ─────────────────────────────────────────────────
function BarcodeLabel({ product, variant, copies, showPrice, showName }) {
  const value = variant?.barcode || product.barcode;
  const name  = variant
    ? `${product.name} — ${variant.label}`
    : product.name;
  const price = variant ? variant.price : product.price;

  if (!value) return null;

  return (
    <div className="barcode-cell flex flex-col items-center border border-neutral-200 rounded-xl p-3 bg-white">
      {showName && (
        <p className="text-xs font-semibold text-neutral-800 text-center mb-1 max-w-[140px] truncate">
          {name}
        </p>
      )}
      <BarcodeDisplay value={value} height={45} width={1.5} fontSize={10}/>
      {showPrice && (
        <p className="text-xs font-bold text-primary-700 mt-1">{price} EGP</p>
      )}
    </div>
  );
}

export default function BarcodePrintPage() {
  const [selected,  setSelected]  = useState(new Set());
  const [copies,    setCopies]    = useState(1);
  const [showPrice, setShowPrice] = useState(true);
  const [showName,  setShowName]  = useState(true);
  const [perRow,    setPerRow]    = useState(4);
  const [search,    setSearch]    = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products-for-barcode'],
    queryFn:  () => productsAPI.getAdminAll({ limit: 200, isActive: 'true' }).then(r => r.data.data),
  });

  const products = (data || []).filter(p => {
    const hasBarcodes = p.barcode || p.variants?.some(v => v.barcode);
    if (!hasBarcodes) return false;
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase()) ||
           p.genericName?.toLowerCase().includes(search.toLowerCase()) ||
           p.barcode?.includes(search);
  });

  const toggleSelect = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAll   = () => setSelected(new Set(buildKeys()));
  const deselectAll = () => setSelected(new Set());

  // Build print keys (product:id or product:id:variantId)
  const buildKeys = () => {
    const keys = [];
    for (const p of products) {
      if (p.hasVariants && p.variants?.length > 0) {
        p.variants.filter(v => v.barcode).forEach(v => keys.push(`${p._id}:${v._id}`));
      } else if (p.barcode) {
        keys.push(p._id);
      }
    }
    return keys;
  };

  // Build labels to print
  const buildLabels = () => {
    const labels = [];
    for (const p of products) {
      if (p.hasVariants && p.variants?.length > 0) {
        p.variants.filter(v => v.barcode).forEach(v => {
          const key = `${p._id}:${v._id}`;
          if (selected.has(key)) {
            for (let i = 0; i < copies; i++) {
              labels.push({ product: p, variant: v, key: `${key}-${i}` });
            }
          }
        });
      } else if (p.barcode && selected.has(p._id)) {
        for (let i = 0; i < copies; i++) {
          labels.push({ product: p, variant: null, key: `${p._id}-${i}` });
        }
      }
    }
    return labels;
  };

  const handlePrint = () => {
    if (selected.size === 0) return;
    const style = document.createElement('style');
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.head.removeChild(style), 1500);
  };

  const labels = buildLabels();

  return (
    <div>
      {/* Header */}
      <div id="no-print" className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">طباعة الباركود</h1>
          <p className="text-neutral-500 text-sm mt-0.5">اختر المنتجات وطباعة الباركود بتنسيق A4</p>
        </div>
        <button onClick={handlePrint} disabled={selected.size === 0}
          className="btn-primary disabled:opacity-40">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          طباعة {labels.length > 0 ? `(${labels.length} ليبل)` : ''}
        </button>
      </div>

      {/* Controls */}
      <div id="no-print" className="card p-4 mb-5 space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="input pl-9 text-sm" placeholder="بحث بالاسم أو الباركود…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          {/* Copies */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-600 whitespace-nowrap">نسخ لكل منتج:</label>
            <input type="number" min="1" max="20" className="input w-20 text-sm text-center"
              value={copies} onChange={e => setCopies(Math.max(1, Number(e.target.value)))}/>
          </div>
          {/* Per row */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-600 whitespace-nowrap">في الصف:</label>
            <select className="input w-24 text-sm" value={perRow} onChange={e => setPerRow(Number(e.target.value))}>
              {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-700">
            <input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} className="accent-primary-600"/>
            إظهار اسم المنتج
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-700">
            <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} className="accent-primary-600"/>
            إظهار السعر
          </label>
        </div>

        {/* Select all */}
        <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
          <button onClick={selectAll}   className="btn-secondary btn-sm">تحديد الكل</button>
          <button onClick={deselectAll} className="btn-ghost btn-sm">إلغاء الكل</button>
          <span className="text-xs text-neutral-500">{selected.size} منتج محدد</span>
        </div>
      </div>

      {/* Product selection list */}
      <div id="no-print" className="card mb-5">
        <div className="px-5 py-3 border-b border-neutral-100">
          <h3 className="font-semibold text-neutral-800 text-sm">
            المنتجات التي لها باركود ({products.length})
          </h3>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-neutral-500 text-sm">لا توجد منتجات لها باركود</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {products.map(p => {
              // Collect all barcode entries for this product
              const entries = p.hasVariants && p.variants?.length > 0
                ? p.variants.filter(v => v.barcode).map(v => ({ key: `${p._id}:${v._id}`, label: `${p.name} — ${v.label}`, value: v.barcode, price: v.price }))
                : p.barcode
                  ? [{ key: p._id, label: p.name, value: p.barcode, price: p.price }]
                  : [];

              if (entries.length === 0) return null;

              return (
                <div key={p._id} className="px-5 py-3">
                  {entries.map(entry => (
                    <label key={entry.key}
                      className="flex items-center gap-3 cursor-pointer py-1.5 hover:bg-neutral-50 rounded-lg px-2 -mx-2 transition-colors">
                      <input type="checkbox"
                        checked={selected.has(entry.key)}
                        onChange={() => toggleSelect(entry.key)}
                        className="w-4 h-4 accent-primary-600 shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">{entry.label}</p>
                        <p className="text-xs text-neutral-400 font-mono">{entry.value}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary-700 shrink-0">{entry.price} EGP</span>
                      {/* Mini barcode preview */}
                      <div className="shrink-0 scale-75 origin-right">
                        <BarcodeDisplay value={entry.value} height={28} width={1} fontSize={8} showLabel={false}/>
                      </div>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PRINTABLE AREA ─────────────────────────────────────────────── */}
      <div id="barcode-print-root" className="hidden print:block">
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${perRow}, 1fr)`,
          gap: '8px',
          padding: '10mm',
        }}>
          {labels.map(({ product, variant, key }) => (
            <BarcodeLabel
              key={key}
              product={product}
              variant={variant}
              copies={1}
              showPrice={showPrice}
              showName={showName}
            />
          ))}
        </div>
      </div>

      {/* Print preview */}
      {labels.length > 0 && (
        <div id="no-print" className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-800">معاينة الطباعة ({labels.length} ليبل)</h3>
          </div>
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${Math.min(perRow, 6)}, minmax(0, 1fr))` }}>
            {labels.slice(0, perRow * 3).map(({ product, variant, key }) => (
              <BarcodeLabel
                key={key}
                product={product}
                variant={variant}
                copies={1}
                showPrice={showPrice}
                showName={showName}
              />
            ))}
          </div>
          {labels.length > perRow * 3 && (
            <p className="text-xs text-neutral-400 text-center mt-3">
              + {labels.length - perRow * 3} ليبل إضافي لن يظهر في المعاينة
            </p>
          )}
        </div>
      )}
    </div>
  );
}
