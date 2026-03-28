import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useCartStore from '@/store/cartStore';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;
function CartItemRow({ item, onUpdate, onRemove }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const p = item?.product;
  if (!p || typeof p !== 'object') return null;

  const price = item.price || p.price || 0;
  const unit  = item.unitLabel || item.unit || p.unitLabel || '';

  const handleQtyChange = async (newQty) => {
    if (newQty < 1) return;
    setLoading(true);
    try { await onUpdate(p._id, newQty); }
    finally { setLoading(false); }
  };

  const handleRemove = async () => {
    setLoading(true);
    try { await onRemove(p._id); }
    finally { setLoading(false); }
  };

  return (
    <div className={`card p-4 flex gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <Link to={`/store/${p._id}`} className="w-20 h-20 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
        {p.image
          ? <img
          src={`${URL_IMAGE}/api/images/${p.image}`}
          alt={p.name}
          className="w-full h-full object-cover"
          onError={(e) => (e.target.src = "/placeholder.png")}
        />
          : <div className="w-full h-full flex items-center justify-center text-2xl">💊</div>
        }
      </Link>

      <div className="flex-1 min-w-0">
        <Link to={`/store/${p._id}`} className="font-semibold text-neutral-800 text-sm line-clamp-1 hover:text-primary-700">
          {p.name}
        </Link>
        <p className="text-xs text-neutral-400 mt-0.5">{p.category}{unit ? ` · ${unit}` : ''}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center bg-neutral-100 rounded-xl p-0.5">
            <button onClick={() => handleQtyChange(item.quantity - 1)}
              disabled={loading || item.quantity <= 1}
              className="w-8 h-8 rounded-lg bg-white text-lg font-bold flex items-center justify-center disabled:opacity-40 hover:bg-neutral-50">−</button>
            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
            <button onClick={() => handleQtyChange(item.quantity + 1)}
              disabled={loading}
              className="w-8 h-8 rounded-lg bg-white text-lg font-bold flex items-center justify-center hover:bg-neutral-50">+</button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-neutral-900">
              {(price * item.quantity).toFixed(2)} {t('common.currency')}
            </span>
            <button onClick={handleRemove} disabled={loading}
              title={t('cart.remove')}
              className="w-8 h-8 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { t } = useTranslation();
  const { cart, updateItem, removeItem, clearCart, isLoading } = useCartStore();
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);

  const items    = cart?.items || [];
  const subtotal = cart?.subtotal || items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
  const shipping = subtotal >= 500 ? 0 : 30;
  const total    = subtotal + shipping;

  if (!accessToken) {
    return (
      <div className="section container-app">
        <div className="card p-16 text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="font-display text-xl font-semibold mb-3">{t('errors.unauthorized')}</h2>
          <Link to="/login" className="btn-primary">{t('auth.login')}</Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="section container-app">
        <div className="space-y-4 max-w-2xl">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl"/>)}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="section container-app">
        <div className="card p-16 text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="font-display text-2xl font-semibold mb-3">{t('cart.empty')}</h2>
          <p className="text-neutral-500 mb-6">{t('cart.emptyDesc')}</p>
          <Link to="/store" className="btn-primary">{t('cart.continueShopping')}</Link>
        </div>
      </div>
    );
  }

  const handleClear = async () => {
    if (!window.confirm(t('cart.confirmClear'))) return;
    setClearing(true);
    try { await clearCart(); toast.success(t('common.success')); }
    finally { setClearing(false); }
  };

  return (
    <div className="section">
      <div className="container-app">
        <div className="flex items-center justify-between mb-8">
          <h1 className="section-title">{t('cart.title')}</h1>
          <button onClick={handleClear} disabled={clearing}
            className="btn-ghost btn-sm text-red-500 hover:bg-red-50 disabled:opacity-40">
            🗑 {t('cart.clearCart')}
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <CartItemRow
                key={item._id || item.product?._id}
                item={item}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="font-display font-semibold text-lg mb-5">{t('checkout.orderSummary')}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>{t('cart.subtotal')} ({items.length} {items.length === 1 ? t('cart.item') : t('cart.items')})</span>
                  <span>{subtotal.toFixed(2)} {t('common.currency')}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>{t('cart.shipping')}</span>
                  <span className={shipping === 0 ? 'text-primary-600 font-medium' : ''}>
                    {shipping === 0 ? `${t('cart.freeShipping')} 🎉` : `${shipping} ${t('common.currency')}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-neutral-400">
                    {t('cart.freeShippingNote', { amount: (500 - subtotal).toFixed(0) })}
                  </p>
                )}
                <div className="border-t border-neutral-100 pt-3 flex justify-between font-bold text-neutral-900 text-base">
                  <span>{t('cart.total')}</span>
                  <span>{total.toFixed(2)} {t('common.currency')}</span>
                </div>
              </div>

              <button onClick={() => navigate('/checkout')}
                className="btn-primary w-full justify-center mt-6 py-3.5 text-base">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                {t('cart.checkout')}
              </button>

              <Link to="/store" className="block text-center text-sm text-primary-600 hover:underline mt-4">
                ← {t('cart.continueShopping')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}