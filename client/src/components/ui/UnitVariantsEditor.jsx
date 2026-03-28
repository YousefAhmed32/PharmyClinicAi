import React from 'react';

const UNIT_PRESETS = [
  { unit: 'piece',   label: 'حبة',    icon: '💊' },
  { unit: 'strip',   label: 'شريط',   icon: '📋' },
  { unit: 'box',     label: 'علبة',   icon: '📦' },
  { unit: 'bottle',  label: 'زجاجة',  icon: '🧴' },
  { unit: 'vial',    label: 'أمبول',  icon: '💉' },
  { unit: 'sachet',  label: 'كيس',    icon: '🗂️' },
  { unit: 'tube',    label: 'أنبوب',  icon: '🧪' },
  { unit: 'pack',    label: 'عبوة',   icon: '🛍️' },
];

const EMPTY_VARIANT = {
  unit: 'piece', label: 'حبة', price: '', comparePrice: '', stock: '',
  barcode: '', sku: '', isDefault: false, itemsPerUnit: 1,
};

/**
 * UnitVariantsEditor
 * Props:
 *   variants: array of variant objects
 *   onChange(variants): called with updated array
 */
export default function UnitVariantsEditor({ variants = [], onChange }) {
  const addVariant = () => {
    const preset = UNIT_PRESETS[0];
    const newVar = { ...EMPTY_VARIANT, unit: preset.unit, label: preset.label };
    // First variant is default
    if (variants.length === 0) newVar.isDefault = true;
    onChange([...variants, newVar]);
  };

  const removeVariant = (idx) => {
    const updated = variants.filter((_, i) => i !== idx);
    // Ensure one default
    if (updated.length > 0 && !updated.some(v => v.isDefault)) {
      updated[0].isDefault = true;
    }
    onChange(updated);
  };

  const updateVariant = (idx, key, value) => {
    const updated = variants.map((v, i) => i === idx ? { ...v, [key]: value } : v);
    onChange(updated);
  };

  const setDefault = (idx) => {
    const updated = variants.map((v, i) => ({ ...v, isDefault: i === idx }));
    onChange(updated);
  };

  const applyPreset = (idx, preset) => {
    const updated = variants.map((v, i) =>
      i === idx ? { ...v, unit: preset.unit, label: preset.label } : v
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {variants.length === 0 ? (
        <div className="p-6 border-2 border-dashed border-neutral-200 rounded-xl text-center">
          <p className="text-3xl mb-2">📦</p>
          <p className="text-sm text-neutral-500 mb-3">لا توجد وحدات — اضغط "إضافة وحدة"</p>
          <button type="button" onClick={addVariant} className="btn-secondary btn-sm">+ إضافة وحدة</button>
        </div>
      ) : (
        <>
          {variants.map((v, idx) => (
            <div key={idx} className={`p-4 rounded-xl border-2 space-y-3 ${v.isDefault ? 'border-primary-400 bg-primary-50/30' : 'border-neutral-200 bg-white'}`}>
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {UNIT_PRESETS.find(p => p.unit === v.unit)?.icon || '📦'}
                  </span>
                  <span className="font-semibold text-sm text-neutral-800">{v.label || v.unit}</span>
                  {v.isDefault && (
                    <span className="px-2 py-0.5 bg-primary-600 text-white text-[10px] font-bold rounded-full">الافتراضي</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!v.isDefault && (
                    <button type="button" onClick={() => setDefault(idx)}
                      className="text-xs text-primary-600 hover:underline">
                      تعيين كافتراضي
                    </button>
                  )}
                  <button type="button" onClick={() => removeVariant(idx)}
                    className="w-7 h-7 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              {/* Unit type preset */}
              <div>
                <label className="label text-xs">نوع الوحدة</label>
                <div className="flex flex-wrap gap-1.5">
                  {UNIT_PRESETS.map(preset => (
                    <button key={preset.unit} type="button"
                      onClick={() => applyPreset(idx, preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1
                        ${v.unit === preset.unit ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary-300'}`}>
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom label */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">اسم الوحدة (عربي) *</label>
                  <input className="input text-sm" value={v.label}
                    onChange={e => updateVariant(idx, 'label', e.target.value)}
                    placeholder="شريط / علبة / حبة…"/>
                </div>
                <div>
                  <label className="label text-xs">عدد القطع في الوحدة</label>
                  <input type="number" min="1" className="input text-sm" value={v.itemsPerUnit}
                    onChange={e => updateVariant(idx, 'itemsPerUnit', Number(e.target.value))}
                    placeholder="مثال: 10 حبات في الشريط"/>
                </div>
              </div>

              {/* Price + Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">السعر (EGP) *</label>
                  <input type="number" min="0" step="0.01" className="input text-sm" value={v.price}
                    onChange={e => updateVariant(idx, 'price', e.target.value)}
                    placeholder="0.00"/>
                </div>
                <div>
                  <label className="label text-xs">السعر قبل الخصم</label>
                  <input type="number" min="0" step="0.01" className="input text-sm" value={v.comparePrice}
                    onChange={e => updateVariant(idx, 'comparePrice', e.target.value)}
                    placeholder="اختياري"/>
                </div>
                <div>
                  <label className="label text-xs">المخزون *</label>
                  <input type="number" min="0" className="input text-sm" value={v.stock}
                    onChange={e => updateVariant(idx, 'stock', e.target.value)}
                    placeholder="0"/>
                </div>
              </div>

              {/* Barcode + SKU */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">باركود الوحدة</label>
                  <input className="input text-sm font-mono" value={v.barcode}
                    onChange={e => updateVariant(idx, 'barcode', e.target.value)}
                    placeholder="6224000000000"/>
                </div>
                <div>
                  <label className="label text-xs">SKU</label>
                  <input className="input text-sm font-mono" value={v.sku}
                    onChange={e => updateVariant(idx, 'sku', e.target.value)}
                    placeholder="MED-001-STR"/>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addVariant}
            className="w-full py-2.5 border-2 border-dashed border-neutral-300 rounded-xl text-sm text-neutral-500
                       hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/30 transition-all flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            إضافة وحدة
          </button>
        </>
      )}
    </div>
  );
}
