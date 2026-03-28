import React, { useState, useRef, useEffect } from 'react';

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', color = 'text-primary-600' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };
  return (
    <svg className={`animate-spin ${sizes[size]} ${color}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

// ── Loading overlay ───────────────────────────────────────────────────────
export function LoadingOverlay({ message = 'Loading…' }) {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg"/>
        <p className="text-sm text-neutral-500 font-medium">{message}</p>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-display font-semibold text-xl text-neutral-700 mb-2">{title}</h3>
      {description && <p className="text-neutral-400 text-sm max-w-sm mb-6">{description}</p>}
      {action && (
        <button onClick={action.onClick} className={action.variant === 'primary' ? 'btn-primary' : 'btn-secondary'}>
          {action.label}
        </button>
      )}
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────
export function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel, isLoading }) {
  if (!isOpen) return null;

  const btnClass = variant === 'danger' ? 'btn-danger' : 'btn-primary';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="overlay" onClick={onCancel}/>
      <div className="relative z-10 bg-white rounded-2xl shadow-lifted w-full max-w-sm animate-scale-in">
        <div className="p-6">
          <div className={`w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center
            ${variant === 'danger' ? 'bg-red-50' : 'bg-primary-50'}`}>
            {variant === 'danger'
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#339966" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5"/></svg>
            }
          </div>
          <h3 className="font-display font-semibold text-lg text-neutral-900 text-center mb-2">{title}</h3>
          <p className="text-sm text-neutral-500 text-center mb-6">{message}</p>
          <div className="flex gap-3">
            <button onClick={onCancel} disabled={isLoading} className="btn-secondary flex-1">
              {cancelLabel}
            </button>
            <button onClick={onConfirm} disabled={isLoading} className={`${btnClass} flex-1`}>
              {isLoading ? <Spinner size="sm" color="text-white"/> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, size = 'md', children, footer }) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  };

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else        document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose}/>
      <div className={`relative z-50 bg-white rounded-2xl shadow-lifted w-full ${sizeClasses[size]}
                       max-h-[90vh] flex flex-col animate-scale-in`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 shrink-0">
          <h2 className="font-display font-semibold text-lg text-neutral-900">{title}</h2>
          <button onClick={onClose} className="btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 rounded-b-2xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Badge / Status chip ───────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    active:     'badge-green',
    inactive:   'badge-red',
    pending:    'badge-yellow',
    confirmed:  'badge-blue',
    processing: 'badge-blue',
    shipped:    'badge-orange',
    delivered:  'badge-green',
    cancelled:  'badge-red',
    published:  'badge-green',
    draft:      'badge-yellow',
    open:       'badge-green',
    closed:     'badge-gray',
    completed:  'badge-blue',
    'no-show':  'badge-gray',
    paid:       'badge-green',
    failed:     'badge-red',
    refunded:   'badge-gray',
    'in-stock': 'badge-green',
    'low-stock':'badge-yellow',
    'out-of-stock': 'badge-red',
  };
  return (
    <span className={`${map[status] || 'badge-gray'} capitalize`}>
      {status?.replace(/-/g, ' ')}
    </span>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, total, limit, onChange }) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  // Page range around current
  const range = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    range.push(i);
  }

  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
      <p className="text-sm text-neutral-500 hidden sm:block">
        Showing <span className="font-medium">{from}–{to}</span> of <span className="font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-1 mx-auto sm:mx-0">
        {/* First */}
        {page > 3 && (
          <>
            <button onClick={() => onChange(1)} className="w-8 h-8 rounded-lg text-sm hover:bg-neutral-100 text-neutral-600">1</button>
            {page > 4 && <span className="text-neutral-400 px-1">…</span>}
          </>
        )}

        {/* Range */}
        {range.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
              ${p === page ? 'bg-primary-600 text-white shadow-sm' : 'hover:bg-neutral-100 text-neutral-700'}`}>
            {p}
          </button>
        ))}

        {/* Last */}
        {page < totalPages - 2 && (
          <>
            {page < totalPages - 3 && <span className="text-neutral-400 px-1">…</span>}
            <button onClick={() => onChange(totalPages)} className="w-8 h-8 rounded-lg text-sm hover:bg-neutral-100 text-neutral-600">{totalPages}</button>
          </>
        )}

        {/* Prev/Next */}
        <div className="flex gap-1 ml-2">
          <button disabled={page <= 1} onClick={() => onChange(page - 1)}
            className="btn-ghost btn-sm disabled:opacity-40 px-2">
            ←
          </button>
          <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}
            className="btn-ghost btn-sm disabled:opacity-40 px-2">
            →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Search input ──────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
        width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="text"
        className="input pl-9 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────
export function Tooltip({ children, text, position = 'top' }) {
  const [visible, setVisible] = useState(false);
  const posClasses = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full  left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full  top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <div className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className={`absolute z-50 ${posClasses[position]} whitespace-nowrap
          bg-neutral-900 text-white text-xs px-2 py-1 rounded-lg pointer-events-none`}>
          {text}
        </div>
      )}
    </div>
  );
}

// ── Copy to clipboard button ──────────────────────────────────────────────
export function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} className={`btn-icon text-xs ${className}`} title="Copy">
      {copied
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#339966" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      }
    </button>
  );
}

// ── Back button ───────────────────────────────────────────────────────────
export function BackButton({ label = 'Back', onClick }) {
  return (
    <button onClick={onClick} className="btn-ghost btn-sm gap-1.5 text-neutral-600 mb-4">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      {label}
    </button>
  );
}
