import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/axios';
import toast from 'react-hot-toast';
import BarcodeScanner from './BarcodeScanner';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;
const CATEGORIES = ['vitamins','supplements','skincare','medicines','equipment','babycare','personal-care','other'];

/**
 * BarcodeLookup — full flow:
 * 1. Open scanner
 * 2. On barcode detected → lookup product
 * 3a. If found → show product info
 * 3b. If not found → show quick-create form
 */
export default function BarcodeLookup({ onProductFound, onClose }) {
  const qc = useQueryClient();
  const [step,       setStep]       = useState('scan');   // scan | found | create | loading
  const [barcode,    setBarcode]    = useState('');
  const [product,    setProduct]    = useState(null);
  const [createForm, setCreateForm] = useState({
    name:'', price:'', stock:'', category:'medicines', genericName:'', description:''
  });

  // Look up barcode on backend
  const handleBarcodeDetected = async (code) => {
    setBarcode(code);
    setStep('loading');
    try {
      const { data } = await api.get(`/barcode/${encodeURIComponent(code)}`);
      if (data.data.found) {
        setProduct(data.data.product);
        setStep('found');
      } else {
        setStep('create');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lookup failed');
      setStep('scan');
    }
  };

  // Quick create product
  const quickCreate = useMutation({
    mutationFn: (body) => api.post('/barcode/quick-create', body),
    onSuccess: (res) => {
      toast.success('Product created via barcode ✓');
      qc.invalidateQueries(['admin-products']);
      onProductFound?.(res.data.data);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create'),
  });

  const handleQuickCreate = (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.price || !createForm.stock || !createForm.category) {
      toast.error('Please fill in all required fields');
      return;
    }
    quickCreate.mutate({ barcode, ...createForm, price: Number(createForm.price), stock: Number(createForm.stock) });
  };

  const f = (k) => (e) => setCreateForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <>
      {/* Step: Scanner */}
      {step === 'scan' && (
        <BarcodeScanner onDetected={handleBarcodeDetected} onClose={onClose}/>
      )}

      {/* Step: Loading */}
      {step === 'loading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay"/>
          <div className="relative z-50 bg-white rounded-2xl p-8 text-center shadow-lifted animate-scale-in">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <svg className="animate-spin w-8 h-8 text-primary-600" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="font-semibold text-neutral-800">Looking up barcode…</p>
            <p className="text-sm text-neutral-500 mt-1 font-mono">{barcode}</p>
          </div>
        </div>
      )}

      {/* Step: Product Found */}
      {step === 'found' && product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={onClose}/>
          <div className="relative z-50 bg-white rounded-2xl shadow-lifted w-full max-w-md animate-scale-in">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <h2 className="font-semibold text-lg text-neutral-900">Product Found!</h2>
              </div>
              <button onClick={onClose} className="btn-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl">
                <div className="w-16 h-16 rounded-xl bg-neutral-200 overflow-hidden shrink-0">
                  {product.image
                    ? <img
                    src={`${URL_IMAGE}/api/images/${product.image}`}
                    alt={product.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = "/placeholder.png";
                    }}
                    className="w-full h-full object-cover"
                  />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">💊</div>
                  }
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-800">{product.name}</h3>
                  {product.genericName && <p className="text-xs text-neutral-500">Generic: {product.genericName}</p>}
                  <p className="text-sm font-bold text-primary-700 mt-1">{product.price} EGP</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className={`text-xs font-medium ${product.stock > 0 ? 'text-primary-600' : 'text-red-500'}`}>
                      Stock: {product.stock}
                    </span>
                    <span className="badge-gray capitalize text-xs">{product.category}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-neutral-50 rounded-xl p-3">
                  <p className="text-xs text-neutral-400">Barcode</p>
                  <p className="font-mono font-medium text-neutral-800">{product.barcode}</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-3">
                  <p className="text-xs text-neutral-400">SKU</p>
                  <p className="font-mono font-medium text-neutral-800">{product.sku || '—'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { onProductFound?.(product); onClose(); }} className="btn-primary flex-1 justify-center">
                  Use This Product
                </button>
                <button onClick={() => setStep('scan')} className="btn-secondary flex-1 justify-center">
                  Scan Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step: Quick Create */}
      {step === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={onClose}/>
          <div className="relative z-50 bg-white rounded-2xl shadow-lifted w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🆕</span>
                  <h2 className="font-semibold text-lg">New Product from Barcode</h2>
                </div>
                <p className="text-xs text-neutral-500 font-mono">Barcode: {barcode}</p>
              </div>
              <button onClick={onClose} className="btn-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleQuickCreate} className="p-5 space-y-4">
              <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                <p className="text-xs text-yellow-700">
                  ⚠️ No product found for barcode <strong className="font-mono">{barcode}</strong>. Fill in the details to create a new product.
                </p>
              </div>

              <div>
                <label className="label">Product Name *</label>
                <input className="input" value={createForm.name} onChange={f('name')} placeholder="e.g. Paracetamol 500mg" required/>
              </div>

              <div>
                <label className="label">Generic Name</label>
                <input className="input" value={createForm.genericName} onChange={f('genericName')} placeholder="e.g. Paracetamol"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Price (EGP) *</label>
                  <input type="number" min="0" step="0.01" className="input" value={createForm.price} onChange={f('price')} required/>
                </div>
                <div>
                  <label className="label">Initial Stock *</label>
                  <input type="number" min="0" className="input" value={createForm.stock} onChange={f('stock')} required/>
                </div>
              </div>

              <div>
                <label className="label">Category *</label>
                <select className="input" value={createForm.category} onChange={f('category')}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('-',' ')}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={createForm.description} onChange={f('description')} placeholder="Brief description…"/>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('scan')} className="btn-secondary flex-1">
                  ← Scan Again
                </button>
                <button type="submit" disabled={quickCreate.isPending} className="btn-primary flex-1 justify-center">
                  {quickCreate.isPending ? 'Creating…' : '✓ Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
