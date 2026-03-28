import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsAPI } from '@/api/services';
import useCartStore from '@/store/cartStore';
import useAuthStore from '@/store/authStore';
import { CardSkeleton } from '@/components/ui/Skeletons';
import { EmptyState } from '@/components/ui/UIComponents';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;

export default function ProductDetailPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { addItem } = useCartStore();
  const { accessToken } = useAuthStore();

  const [qty,             setQty]             = useState(1);
  const [adding,          setAdding]          = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn:  () => productsAPI.getOne(id).then(r => r.data.data),
    retry: 1,
  });

  const product = data?.product || data;
  const related = data?.related || [];

  // Set default variant
  useEffect(() => {
    if (product?.hasVariants && product.variants?.length > 0) {
      const def = product.variants.find(v => v.isDefault) || product.variants[0];
      setSelectedVariant(def);
      setQty(1);
    }
  }, [product?._id]);

  // Computed values
  const effectivePrice = product?.hasVariants && selectedVariant
    ? selectedVariant.price
    : product?.price;

  const effectiveStock = product?.hasVariants && selectedVariant
    ? selectedVariant.stock
    : product?.stock || 0;

  const comparePrice = product?.hasVariants && selectedVariant
    ? selectedVariant.comparePrice
    : product?.comparePrice;

  const discountPct = comparePrice && comparePrice > effectivePrice
    ? Math.round(((comparePrice - effectivePrice) / comparePrice) * 100)
    : 0;

  // Loading
  if (isLoading) return (
    <div className="section container-app">
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="skeleton aspect-square rounded-3xl"/>
        <div className="space-y-4 pt-4">
          <CardSkeleton lines={6}/>
        </div>
      </div>
    </div>
  );

  // Error / not found
  if (error || !product) return (
    <div className="section container-app">
      <EmptyState
        icon="🔍"
        title="المنتج غير موجود"
        description="هذا المنتج غير متاح أو تم حذفه"
        action={{ label: 'تصفح المتجر', onClick: () => navigate('/store'), variant: 'primary' }}
      />
    </div>
  );

  const handleAddToCart = async () => {
    if (!accessToken) { toast.error('سجّل دخولك أولاً'); navigate('/login'); return; }
    if (effectiveStock === 0) { toast.error('المنتج غير متاح حالياً'); return; }
    setAdding(true);
    try {
      await addItem(product._id, qty);
      toast.success(`تمت إضافة "${product.name}" للسلة ✓`);
      navigate('/cart');
    } catch {
      toast.error('فشل الإضافة — حاول مرة أخرى');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="section">
      <div className="container-app">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-8">
          <Link to="/"      className="hover:text-primary-600">الرئيسية</Link>
          <span>/</span>
          <Link to="/store" className="hover:text-primary-600">المتجر</Link>
          <span>/</span>
          <span className="text-neutral-700 truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Image */}
          <div className="sticky top-24">
            <div className="relative aspect-square bg-neutral-100 rounded-3xl overflow-hidden">
              {product.image ? (
                <img
              
                src={`${URL_IMAGE}/api/images/${product.image}`}
                alt={product.name}
              
                  className="w-full h-full object-cover"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">💊</div>
              )}
              {discountPct > 0 && (
                <div className="absolute top-4 left-4 w-14 h-14 rounded-full bg-accent-500 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">-{discountPct}%</span>
                </div>
              )}
              {effectiveStock === 0 && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <span className="badge-red text-base px-6 py-2 font-semibold">نفد المخزون</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <Link to={`/store?category=${product.category}`}
                className="badge-green text-xs capitalize mb-3 inline-flex hover:bg-primary-200 transition-colors">
                {product.category?.replace('-', ' ')}
              </Link>
              <h1 className="font-display text-3xl font-bold text-neutral-900 leading-tight">
                {product.name}
              </h1>
              {product.genericName && (
                <p className="text-neutral-500 mt-1">{product.genericName}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="font-display font-bold text-4xl text-neutral-900">
                {effectivePrice} EGP
              </span>
              {comparePrice > effectivePrice && (
                <span className="text-xl text-neutral-400 line-through">{comparePrice} EGP</span>
              )}
              {discountPct > 0 && (
                <span className="badge-orange text-sm">وفّر {discountPct}%</span>
              )}
            </div>

            {/* Description */}
            <p className="text-neutral-600 leading-relaxed">{product.description}</p>

            {/* Unit Variants Selector */}
            {product.hasVariants && product.variants?.length > 0 && (
              <div>
                <label className="label">اختر الوحدة</label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map(v => (
                    <button key={v._id}
                      onClick={() => { setSelectedVariant(v); setQty(1); }}
                      className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                        ${selectedVariant?._id === v._id
                          ? 'border-primary-600 bg-primary-50 text-primary-800'
                          : 'border-neutral-200 text-neutral-600 hover:border-primary-300'
                        }
                        ${v.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={v.stock === 0}>
                      <span className="block">{v.label}</span>
                      <span className="block text-xs mt-0.5 font-bold text-primary-600">{v.price} EGP</span>
                      {v.stock === 0 && <span className="block text-[10px] text-red-500">نفد</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Stock indicator */}
            <div className="flex items-center gap-3 py-4 border-y border-neutral-100">
              <div className={`w-3 h-3 rounded-full ${
                effectiveStock === 0       ? 'bg-red-500' :
                effectiveStock <= 10       ? 'bg-yellow-500 animate-pulse' :
                'bg-primary-500'
              }`}/>
              <span className="text-sm font-medium text-neutral-700">
                {effectiveStock === 0
                  ? 'غير متوفر حالياً'
                  : effectiveStock <= 10
                    ? `متبقي ${effectiveStock} فقط`
                    : `متوفر (${effectiveStock} وحدة)`
                }
              </span>
            </div>

            {/* Quantity + Add to cart */}
            {effectiveStock > 0 && (
              <div className="space-y-4">
                <div>
                  <label className="label">الكمية</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-neutral-100 rounded-xl p-1">
                      <button onClick={() => setQty(q => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-lg hover:bg-neutral-50 transition-colors">
                        −
                      </button>
                      <span className="w-10 text-center font-bold text-neutral-900">{qty}</span>
                      <button onClick={() => setQty(q => Math.min(effectiveStock, q + 1))}
                        className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-lg hover:bg-neutral-50 transition-colors">
                        +
                      </button>
                    </div>
                    <span className="text-sm text-neutral-500">
                      الإجمالي: <strong>{(effectivePrice * qty).toFixed(2)} EGP</strong>
                    </span>
                  </div>
                </div>

                <button onClick={handleAddToCart} disabled={adding}
                  className="btn-primary w-full justify-center py-4 text-base">
                  {adding ? (
                    <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg> جاري الإضافة…</>
                  ) : <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                    أضف للسلة — {(effectivePrice * qty).toFixed(2)} EGP
                  </>}
                </button>
              </div>
            )}

            {/* SKU / Barcode */}
            <div className="flex gap-4 text-xs text-neutral-400 pt-2">
              {product.sku     && <p>SKU: <span className="font-mono">{product.sku}</span></p>}
              {product.barcode && <p>باركود: <span className="font-mono">{product.barcode}</span></p>}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.filter(p => p._id !== product._id).length > 0 && (
          <div className="mt-20">
            <h2 className="font-display text-2xl font-semibold text-neutral-900 mb-6">
              قد يعجبك أيضاً
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {related.filter(p => p._id !== product._id).slice(0, 4).map(p => {
                const rPrice = p.hasVariants && p.variants?.length > 0
                  ? (p.variants.find(v => v.isDefault) || p.variants[0])?.price ?? p.price
                  : p.price;
                return (
                  <Link key={p._id} to={`/store/${p._id}`} className="card-hover group">
                    <div className="aspect-square bg-neutral-100 overflow-hidden">
                      {p.image
                        ? <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                        : <div className="w-full h-full flex items-center justify-center text-3xl">💊</div>
                      }
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-neutral-800 line-clamp-1">{p.name}</p>
                      <p className="text-sm font-bold text-primary-700 mt-1">{rPrice} EGP</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
