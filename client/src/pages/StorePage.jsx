import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { productsAPI } from '@/api/services';
import useCartStore from '@/store/cartStore';
import useAuthStore from '@/store/authStore';
import { useDebounce } from '@/hooks/useCommon';
import { ProductGridSkeleton } from '@/components/ui/Skeletons';
import { SearchInput, Pagination, EmptyState } from '@/components/ui/UIComponents';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;
function ProductCard({ product, onAddToCart, t }) {
  const outOfStock = product.hasVariants
    ? !product.variants?.some(v => v.stock > 0)
    : product.stock === 0;

  const displayPrice = product.hasVariants && product.variants?.length > 0
    ? (product.variants.find(v => v.isDefault) || product.variants[0])?.price ?? product.price
    : product.price;

  const comparePrice = product.comparePrice || null;
  const discountPct  = comparePrice && comparePrice > displayPrice
    ? Math.round(((comparePrice - displayPrice) / comparePrice) * 100)
    : 0;

  const lowStock = !product.hasVariants && product.stock > 0 && product.stock <= 10;

  return (
    <Link to={`/store/${product._id}`} className="card-hover group flex flex-col">
      <div className="aspect-square bg-neutral-100 overflow-hidden relative">
        {product.image ? (
          <img
  src={`${URL_IMAGE}/api/images/${product.image}`}
  alt={product.name}
  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
  loading="lazy"
  onError={(e) => (e.target.src = "/placeholder.png")}
/>
        ) : null}
        <div className={`w-full h-full flex items-center justify-center text-4xl bg-neutral-50 ${product.image ? 'hidden' : 'flex'}`}>
          💊
        </div>

        {discountPct > 0 && (
          <span className="absolute top-2 start-2 badge-orange text-xs">-{discountPct}%</span>
        )}

        {product.hasVariants && product.variants?.length > 0 && (
          <div className="absolute bottom-2 start-2 flex gap-1">
            {product.variants.slice(0, 2).map((v, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-white/90 text-primary-700 text-[10px] font-semibold rounded-md border border-primary-100">
                {v.label}
              </span>
            ))}
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="badge-red font-semibold">{t('store.outOfStock')}</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-primary-600 font-medium capitalize mb-1">
          {product.category?.replace('-', ' ')}
        </p>
        <h3 className="font-semibold text-neutral-800 text-sm line-clamp-2 mb-2 flex-1">
          {product.name}
        </h3>
        {product.genericName && (
          <p className="text-xs text-neutral-400 mb-1">{product.genericName}</p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="font-bold text-neutral-900">
              {product.hasVariants ? '← ' : ''}{displayPrice} {t('common.currency')}
            </span>
            {comparePrice > displayPrice && (
              <span className="text-xs text-neutral-400 line-through ms-1.5">{comparePrice}</span>
            )}
          </div>
          {!outOfStock && (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onAddToCart(product._id); }}
              className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 active:scale-95 transition-all shadow-green"
              title={t('store.addToCart')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5"  y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          )}
        </div>

        {lowStock && (
          <p className="text-xs text-yellow-600 mt-1.5">⚠️ {t('store.lowStock')}: {product.stock}</p>
        )}
      </div>
    </Link>
  );
}

export default function StorePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput,  setSearchInput]  = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 350);
  const { addItem }     = useCartStore();
  const { accessToken } = useAuthStore();

  const CATEGORIES = [
    { value: '',              label: t('common.all') },
    { value: 'vitamins',      label: t('store.categories.vitamins') },
    { value: 'supplements',   label: t('store.categories.supplements') },
    { value: 'skincare',      label: t('store.categories.skincare') },
    { value: 'medicines',     label: t('store.categories.medicines') },
    { value: 'equipment',     label: t('store.categories.equipment') },
    { value: 'babycare',      label: t('store.categories.babycare') },
    { value: 'personal-care', label: t('store.categories.personal-care') },
    { value: 'other',         label: t('store.categories.other') },
  ];

  const SORT_OPTIONS = [
    { value: 'createdAt:desc', label: t('store.sortOptions.newest') },
    { value: 'price:asc',      label: t('store.sortOptions.priceAsc') },
    { value: 'price:desc',     label: t('store.sortOptions.priceDesc') },
    { value: 'name:asc',       label: t('store.sortOptions.nameAsc') },
  ];

  const page     = Number(searchParams.get('page')     || 1);
  const category = searchParams.get('category') || '';
  const sort     = searchParams.get('sort')     || 'createdAt:desc';
  const [sortField, sortOrder] = sort.split(':');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', page, category, sort, debouncedSearch],
    queryFn: () => productsAPI.getAll({
      page, limit: 12, sort: sortField, order: sortOrder,
      ...(category        && { category }),
      ...(debouncedSearch && { search: debouncedSearch }),
    }).then(r => r.data),
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000,
  });

  const products = data?.data || [];
  const meta     = data?.meta || {};

  const setParam = (key, val) => {
    const p = new URLSearchParams(searchParams);
    val ? p.set(key, val) : p.delete(key);
    p.delete('page');
    setSearchParams(p);
  };

  const handleAddToCart = async (productId) => {
    if (!accessToken) { toast.error(t('errors.unauthorized')); return; }
    try { await addItem(productId, 1); }
    catch { /* store handles error */ }
  };

  const hasFilter = category || debouncedSearch;

  return (
    <div className="section">
      <div className="container-app">
        <div className="mb-8">
          <h1 className="section-title">{t('store.title')}</h1>
          <p className="section-subtitle">
            {meta.total
              ? t('store.showing', { count: meta.total.toLocaleString() })
              : t('store.searchPlaceholder')}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder={t('store.searchPlaceholder')}
            className="flex-1 min-w-[200px] max-w-sm"
          />
          <select className="input w-auto text-sm" value={sort}
            onChange={e => setParam('sort', e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setParam('category', c.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                category === c.value
                  ? 'bg-primary-600 text-white border-primary-600 shadow-green'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 hover:text-primary-700'
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className={`transition-opacity duration-200 ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
          {isLoading ? (
            <ProductGridSkeleton count={12}/>
          ) : products.length === 0 ? (
            <EmptyState
              icon="🔍"
              title={t('store.noProducts')}
              description={t('common.noResults')}
              action={hasFilter ? {
                label: t('common.filter'),
                onClick: () => { setSearchInput(''); setSearchParams({}); },
                variant: 'secondary',
              } : null}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map(p => (
                <ProductCard key={p._id} product={p} onAddToCart={handleAddToCart} t={t}/>
              ))}
            </div>
          )}
        </div>

        {meta.totalPages > 1 && (
          <div className="mt-10">
            <Pagination
              page={meta.page} totalPages={meta.totalPages}
              total={meta.total} limit={meta.limit}
              onChange={p => {
                const params = new URLSearchParams(searchParams);
                params.set('page', p);
                setSearchParams(params);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}