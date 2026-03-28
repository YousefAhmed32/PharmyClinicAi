import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebouncedCallback } from '@/hooks/useCommon';
import { productsAPI } from '@/api/services';
import BarcodeLookup from '@/components/ui/BarcodeLookup';
import UnitVariantsEditor from '@/components/ui/UnitVariantsEditor';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;

const CATEGORIES = [
  'vitamins','supplements','skincare','medicines',
  'equipment','babycare','personal-care','other',
];

const EMPTY = {
  name:'', description:'', category:'medicines',
  price:'', comparePrice:'', stock:'',
  barcode:'', genericName:'', sku:'', expiryDate:'',
  isFeatured:false, isActive:true, tags:'',
  unit:'piece', unitLabel:'قطعة',
  hasVariants:false, variants:[],
};

// ── Product Form Modal ────────────────────────────────────────────────────
function ProductModal({ editing, onClose, onSave, isSaving }) {
  const isEdit = !!editing;
  const [form, setForm] = useState(() => {
    if (!editing) return EMPTY;
    return {
      name:        editing.name || '',
      description: editing.description || '',
      category:    editing.category || 'medicines',
      price:       editing.price || '',
      comparePrice:editing.comparePrice || '',
      stock:       editing.stock || '',
      barcode:     editing.barcode || '',
      genericName: editing.genericName || '',
      sku:         editing.sku || '',
      expiryDate:  editing.expiryDate ? editing.expiryDate.split('T')[0] : '',
      isFeatured:  editing.isFeatured || false,
      isActive:    editing.isActive !== false,
      tags:        Array.isArray(editing.tags) ? editing.tags.join(', ') : '',
      unit:        editing.unit || 'piece',
      unitLabel:   editing.unitLabel || 'قطعة',
      hasVariants: editing.hasVariants || false,
      variants:    editing.variants || [],
    };
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(
    editing?.image ? `${URL_IMAGE}/api/images/${editing.image}` : null
  );
  const [errors,    setErrors]    = useState({});
  const [tab,       setTab]       = useState('basic'); // basic | units | meta

  const f = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [k]: val }));
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.length < 2)     e.name        = 'الاسم مطلوب (2 أحرف على الأقل)';
    if (!form.description.trim() || form.description.length < 10) e.description = 'الوصف مطلوب (10 أحرف على الأقل)';
    if (!form.category)                                 e.category    = 'الفئة مطلوبة';
    if (!form.hasVariants) {
      if (!form.price && form.price !== 0)              e.price       = 'السعر مطلوب';
      if (!form.stock && form.stock !== 0)              e.stock       = 'المخزون مطلوب';
    } else {
      if (form.variants.length === 0)                   e.variants    = 'أضف وحدة واحدة على الأقل';
      const invalid = form.variants.filter(v => !v.price || !v.label);
      if (invalid.length > 0)                           e.variants    = 'جميع الوحدات تحتاج سعر واسم';
    }
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      setTab(errs.variants ? 'units' : errs.name || errs.description || errs.category ? 'basic' : 'meta');
      return;
    }
    const fd = new FormData();
    // Basic fields
    fd.append('name',        form.name.trim());
    fd.append('description', form.description.trim());
    fd.append('category',    form.category);
    fd.append('isFeatured',  form.isFeatured);
    fd.append('isActive',    form.isActive);
    if (form.tags) fd.append('tags', JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean)));
    if (form.barcode)     fd.append('barcode',     form.barcode.trim());
    if (form.genericName) fd.append('genericName', form.genericName.trim());
    if (form.sku)         fd.append('sku',         form.sku.trim());
    if (form.expiryDate)  fd.append('expiryDate',  form.expiryDate);
    // Unit mode
    fd.append('hasVariants', form.hasVariants);
    if (form.hasVariants) {
      fd.append('variants', JSON.stringify(form.variants.map(v => ({
        ...v,
        price:        Number(v.price),
        comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
        stock:        Number(v.stock),
        itemsPerUnit: Number(v.itemsPerUnit) || 1,
      }))));
      // Use default variant price/stock for search/display
      const def = form.variants.find(v => v.isDefault) || form.variants[0];
      fd.append('price', Number(def?.price || 0));
      fd.append('stock', form.variants.reduce((s, v) => s + Number(v.stock || 0), 0));
    } else {
      fd.append('price',        Number(form.price));
      fd.append('stock',        Number(form.stock));
      fd.append('unit',         form.unit);
      fd.append('unitLabel',    form.unitLabel);
      if (form.comparePrice) fd.append('comparePrice', Number(form.comparePrice));
    }
    if (imageFile) fd.append('image', imageFile);
    onSave(fd);
  };

  const TABS = [
    { id:'basic', label:'📝 بيانات أساسية' },
    { id:'units', label:'📦 الوحدات والسعر' },
    { id:'meta',  label:'⚙️ تفاصيل إضافية' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose}/>
      <div className="relative z-50 bg-white rounded-2xl shadow-lifted w-full max-w-2xl max-h-[92vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 shrink-0">
          <h2 className="font-display font-semibold text-lg">{isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
          <button onClick={onClose} className="btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 px-6 shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">

            {/* ── Tab: Basic ─────────────────────────────────────────────── */}
            {tab === 'basic' && (
              <>
                {/* Image */}
                <div>
                  <label className="label">صورة المنتج</label>
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 rounded-2xl bg-neutral-100 overflow-hidden flex items-center justify-center border-2 border-dashed border-neutral-200 shrink-0">
                      {preview ?<img
  src={`${URL_IMAGE}/api/images/${p.image}`}
  alt={p.name}
  className="w-full h-full object-cover"
  onError={(e) => (e.target.src = "/placeholder.png")}
/> : <span className="text-3xl">💊</span>}
                    </div>
                    <div>
                      <input type="file" accept="image/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) { setImageFile(file); setPreview(URL.createObjectURL(file)); }
                        }}
                        className="text-sm text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700"/>
                      <p className="text-xs text-neutral-400 mt-1">JPG, PNG · موصى به 800×800px</p>
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="label">اسم المنتج *</label>
                  <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={f('name')} placeholder="مثال: باراسيتامول 500mg"/>
                  {errors.name && <p className="error-text">{errors.name}</p>}
                </div>

                {/* Generic name */}
                <div>
                  <label className="label">الاسم العلمي (Generic Name)</label>
                  <input className="input" value={form.genericName} onChange={f('genericName')} placeholder="مثال: Paracetamol"/>
                </div>

                {/* Description */}
                <div>
                  <label className="label">الوصف *</label>
                  <textarea className={`input ${errors.description ? 'input-error' : ''}`} rows={3}
                    value={form.description} onChange={f('description')} placeholder="وصف المنتج وفوائده…"/>
                  {errors.description && <p className="error-text">{errors.description}</p>}
                </div>

                {/* Category */}
                <div>
                  <label className="label">الفئة *</label>
                  <select className={`input ${errors.category ? 'input-error' : ''}`} value={form.category} onChange={f('category')}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('-',' ')}</option>)}
                  </select>
                  {errors.category && <p className="error-text">{errors.category}</p>}
                </div>
              </>
            )}

            {/* ── Tab: Units ─────────────────────────────────────────────── */}
            {tab === 'units' && (
              <>
                {/* Toggle: single unit vs variants */}
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-800 text-sm">وحدات متعددة</p>
                      <p className="text-xs text-neutral-500 mt-0.5">مثال: شريط بسعر مختلف عن العلبة</p>
                    </div>
                    <button type="button"
                      onClick={() => setForm(prev => ({ ...prev, hasVariants: !prev.hasVariants, variants: !prev.hasVariants ? [] : prev.variants }))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${form.hasVariants ? 'bg-primary-600' : 'bg-neutral-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.hasVariants ? 'translate-x-6' : 'translate-x-0.5'}`}/>
                    </button>
                  </div>
                </div>

                {form.hasVariants ? (
                  <div>
                    {errors.variants && <p className="error-text mb-2">{errors.variants}</p>}
                    <UnitVariantsEditor
                      variants={form.variants}
                      onChange={variants => setForm(prev => ({ ...prev, variants }))}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Single unit config */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">نوع الوحدة</label>
                        <select className="input" value={form.unit} onChange={f('unit')}>
                          <option value="piece">حبة (Piece)</option>
                          <option value="strip">شريط (Strip)</option>
                          <option value="box">علبة (Box)</option>
                          <option value="bottle">زجاجة (Bottle)</option>
                          <option value="vial">أمبول (Vial)</option>
                          <option value="sachet">كيس (Sachet)</option>
                          <option value="tube">أنبوب (Tube)</option>
                          <option value="pack">عبوة (Pack)</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">اسم الوحدة (عربي)</label>
                        <input className="input" value={form.unitLabel} onChange={f('unitLabel')} placeholder="حبة / شريط / علبة"/>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="label">السعر (EGP) *</label>
                        <input type="number" min="0" step="0.01" className={`input ${errors.price ? 'input-error' : ''}`}
                          value={form.price} onChange={f('price')} placeholder="0.00"/>
                        {errors.price && <p className="error-text">{errors.price}</p>}
                      </div>
                      <div>
                        <label className="label">السعر قبل الخصم</label>
                        <input type="number" min="0" step="0.01" className="input" value={form.comparePrice} onChange={f('comparePrice')} placeholder="اختياري"/>
                      </div>
                      <div>
                        <label className="label">المخزون *</label>
                        <input type="number" min="0" className={`input ${errors.stock ? 'input-error' : ''}`}
                          value={form.stock} onChange={f('stock')} placeholder="0"/>
                        {errors.stock && <p className="error-text">{errors.stock}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Tab: Meta ──────────────────────────────────────────────── */}
            {tab === 'meta' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">باركود</label>
                    <input className="input font-mono text-sm" value={form.barcode} onChange={f('barcode')} placeholder="6224000000000"/>
                  </div>
                  <div>
                    <label className="label">SKU</label>
                    <input className="input font-mono text-sm" value={form.sku} onChange={f('sku')} placeholder="MED-001"/>
                  </div>
                </div>

                <div>
                  <label className="label">تاريخ انتهاء الصلاحية</label>
                  <input type="date" className="input" value={form.expiryDate} onChange={f('expiryDate')}/>
                </div>

                <div>
                  <label className="label">Tags <span className="text-neutral-400 font-normal text-xs">(مفصولة بفواصل)</span></label>
                  <input className="input" value={form.tags} onChange={f('tags')} placeholder="vitamins, immunity, daily-use"/>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isFeatured} onChange={f('isFeatured')} className="w-4 h-4 accent-primary-600"/>
                    <span className="text-sm font-medium text-neutral-700">منتج مميز ⭐</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isActive} onChange={f('isActive')} className="w-4 h-4 accent-primary-600"/>
                    <span className="text-sm font-medium text-neutral-700">نشط ✅</span>
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50 rounded-b-2xl shrink-0">
            <div className="flex gap-2">
              {tab !== 'basic'  && <button type="button" onClick={() => setTab(tab === 'meta' ? 'units' : 'basic')} className="btn-ghost btn-sm">← السابق</button>}
              {tab !== 'meta'   && <button type="button" onClick={() => setTab(tab === 'basic' ? 'units' : 'meta')} className="btn-secondary btn-sm">التالي →</button>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost btn-sm">إلغاء</button>
              <button type="submit" disabled={isSaving} className="btn-primary min-w-[120px]">
                {isSaving ? 'جاري الحفظ…' : isEdit ? '💾 حفظ التعديلات' : '✓ إضافة المنتج'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [page,       setPage]       = useState(1);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [selected,   setSelected]   = useState(new Set());
  const [showBarcode,setShowBarcode]= useState(false);
  const [filters,    setFilters]    = useState({ search:'', category:'', isActive:'', stockFilter:'' });

  const debouncedSearch = useDebouncedCallback((val) => {
    setPage(1); setFilters(f => ({ ...f, search: val }));
  }, 350);

  const [searchVal, setSearchVal] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-products', page, filters],
    queryFn: () => productsAPI.getAdminAll({
      page, limit: 12,
      ...(filters.search   && { search:   filters.search }),
      ...(filters.category && { category: filters.category }),
      ...(filters.isActive !== '' && { isActive: filters.isActive }),
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const save = useMutation({
    mutationFn: (fd) => editing ? productsAPI.update(editing._id, fd) : productsAPI.create(fd),
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث المنتج ✓' : 'تم إضافة المنتج ✓');
      qc.invalidateQueries(['admin-products']);
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'فشل الحفظ'),
  });

  const remove = useMutation({
    mutationFn: (id) => productsAPI.delete(id),
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries(['admin-products']); },
    onError: (err) => toast.error(err.response?.data?.message || 'فشل الحذف'),
  });

  const toggleActive = useMutation({
    mutationFn: (id) => productsAPI.toggleActive(id),
    onSuccess: () => qc.invalidateQueries(['admin-products']),
  });

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit   = (p)  => { setEditing(p);   setShowModal(true); };
  const closeModal = ()   => { setShowModal(false); setEditing(null); };

  const products   = data?.data || [];
  const meta       = data?.meta || {};

  // Filter products by stockFilter client-side
  const displayed = products.filter(p => {
    if (!filters.stockFilter) return true;
    const s = p.hasVariants
      ? p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0)
      : (p.stock || 0);
    if (filters.stockFilter === 'out') return s === 0;
    if (filters.stockFilter === 'low') return s > 0 && s <= 10;
    if (filters.stockFilter === 'ok')  return s > 10;
    return true;
  });

  const getStock = (p) => p.hasVariants
    ? p.variants?.reduce((s, v) => s + (v.stock || 0), 0)
    : p.stock;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">المنتجات</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{meta.total || 0} منتج</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBarcode(true)} className="btn-secondary">
            📷 مسح باركود
          </button>
          <button onClick={openCreate} className="btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            إضافة منتج
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="input pl-9 text-sm" placeholder="بحث بالاسم أو SKU…"
              value={searchVal}
              onChange={e => { setSearchVal(e.target.value); debouncedSearch(e.target.value); }}/>
          </div>
          <select className="input w-auto text-sm" value={filters.category}
            onChange={e => { setPage(1); setFilters(f => ({ ...f, category: e.target.value })); }}>
            <option value="">كل الفئات</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('-',' ')}</option>)}
          </select>
          <select className="input w-auto text-sm" value={filters.stockFilter}
            onChange={e => setFilters(f => ({ ...f, stockFilter: e.target.value }))}>
            <option value="">كل المخزون</option>
            <option value="out">🚨 نفد المخزون</option>
            <option value="low">⚠️ مخزون منخفض</option>
            <option value="ok">✅ متوفر</option>
          </select>
          <select className="input w-auto text-sm" value={filters.isActive}
            onChange={e => { setPage(1); setFilters(f => ({ ...f, isActive: e.target.value })); }}>
            <option value="">الكل</option>
            <option value="true">نشط</option>
            <option value="false">غير نشط</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={`card transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(8)].map((_,i) => <div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
        ) : displayed.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">💊</p>
            <p className="font-semibold text-neutral-700">لا توجد منتجات</p>
            <button onClick={openCreate} className="btn-primary mt-4">إضافة أول منتج</button>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="table">
              <thead>
                <tr><th>المنتج</th><th>الفئة</th><th>الوحدات</th><th>السعر</th><th>المخزون</th><th>الحالة</th><th>إجراء</th></tr>
              </thead>
              <tbody>
                {displayed.map(p => {
                  const stock    = getStock(p);
                  const stockCls = stock === 0 ? 'text-red-600 font-bold' : stock <= 10 ? 'text-yellow-600 font-bold' : 'text-neutral-700';
                  return (
                    <tr key={p._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                            {p.image ? <img
  src={`${URL_IMAGE}/api/images/${p.image}`}
  alt={p.name}
  className="w-full h-full object-cover"
  onError={(e) => (e.target.src = "/placeholder.png")}
/> : <div className="w-full h-full flex items-center justify-center">💊</div>}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-neutral-800 max-w-[160px] truncate">{p.name}</p>
                            {p.genericName && <p className="text-xs text-neutral-400">{p.genericName}</p>}
                          </div>
                        </div>
                      </td>
                      <td><span className="badge-gray text-xs capitalize">{p.category?.replace('-',' ')}</span></td>
                      <td>
                        {p.hasVariants ? (
                          <div className="flex flex-wrap gap-1">
                            {p.variants?.map((v, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-primary-50 text-primary-700 text-[10px] rounded-md font-medium border border-primary-100">
                                {v.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-500">{p.unitLabel || p.unit || 'قطعة'}</span>
                        )}
                      </td>
                      <td>
                        {p.hasVariants ? (
                          <div className="text-xs text-neutral-600">
                            {p.variants?.map((v, i) => (
                              <div key={i}>{v.label}: <span className="font-semibold">{v.price} EGP</span></div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold">{p.price} EGP</span>
                            {p.comparePrice > p.price && <span className="text-xs text-neutral-400 line-through ml-1">{p.comparePrice}</span>}
                          </div>
                        )}
                      </td>
                      <td><span className={`text-sm ${stockCls}`}>{stock}</span></td>
                      <td>
                        <button onClick={() => toggleActive.mutate(p._id)}
                          className={`badge cursor-pointer ${p.isActive ? 'badge-green' : 'badge-red'}`}>
                          {p.isActive ? '✅ نشط' : '❌ متوقف'}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(p)} className="btn-ghost btn-sm text-blue-600">تعديل</button>
                          <button onClick={() => { if(window.confirm(`حذف "${p.name}"؟`)) remove.mutate(p._id); }}
                            className="btn-ghost btn-sm text-red-500 hover:bg-red-50">حذف</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">{((meta.page-1)*meta.limit)+1}–{Math.min(meta.page*meta.limit, meta.total)} من {meta.total}</p>
            <div className="flex gap-1">
              <button disabled={meta.page<=1} onClick={()=>setPage(p=>p-1)} className="btn-ghost btn-sm disabled:opacity-40">← السابق</button>
              {[...Array(Math.min(meta.totalPages,7))].map((_,i)=>(
                <button key={i+1} onClick={()=>setPage(i+1)} className={`w-8 h-8 rounded-lg text-sm ${meta.page===i+1?'bg-primary-600 text-white':'hover:bg-neutral-100'}`}>{i+1}</button>
              ))}
              <button disabled={meta.page>=meta.totalPages} onClick={()=>setPage(p=>p+1)} className="btn-ghost btn-sm disabled:opacity-40">التالي →</button>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          editing={editing}
          onClose={closeModal}
          onSave={fd => save.mutate(fd)}
          isSaving={save.isPending}
        />
      )}

      {/* Barcode Lookup */}
      {showBarcode && (
        <BarcodeLookup
          onProductFound={(product) => { toast.success(`وُجد: ${product.name}`); setShowBarcode(false); }}
          onClose={() => setShowBarcode(false)}
        />
      )}
    </div>
  );
}
