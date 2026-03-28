import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ordersAPI } from '@/api/services';
import useCartStore from '@/store/cartStore';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;

const EGYPT_CITIES = [
  'القاهرة','الجيزة','الإسكندرية','الشرقية','الدقهلية','البحيرة','المنوفية',
  'الغربية','كفر الشيخ','الفيوم','بني سويف','المنيا','أسيوط','سوهاج',
  'قنا','الأقصر','أسوان','الإسماعيلية','بورسعيد','السويس','دمياط',
  'مطروح','شمال سيناء','جنوب سيناء','الوادي الجديد','البحر الأحمر',
];

export default function CheckoutPage() {
  const { t } = useTranslation();
  const { cart, resetCart } = useCartStore();
  const { user }            = useAuthStore();
  const navigate            = useNavigate();

  const PAYMENT_METHODS = [
    { value: 'cash_on_delivery', label: `💵 ${t('checkout.paymentMethods.cash_on_delivery')}` },
    { value: 'credit_card',      label: `💳 ${t('checkout.paymentMethods.credit_card')}` },
    { value: 'debit_card',       label: `💳 ${t('checkout.paymentMethods.debit_card')}` },
    { value: 'wallet',           label: `📱 ${t('checkout.paymentMethods.wallet')}` },
  ];

  const [form, setForm] = useState({
    fullName: user?.name  || '',
    phone:    user?.phone || '',
    street:   '',
    city:     '',
    state:    '',
    zip:      '',
    country:  'Egypt',
  });
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [notes,         setNotes]         = useState('');
  const [errors,        setErrors]        = useState({});

  const items    = cart?.items || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 500 ? 0 : 30;
  const total    = subtotal + shipping;

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = t('common.required');
    if (!form.phone.trim())    e.phone    = t('common.required');
    if (!form.street.trim())   e.street   = t('common.required');
    if (!form.city.trim())     e.city     = t('common.required');
    return e;
  };

  const placeOrder = useMutation({
    mutationFn: () => ordersAPI.checkout({
      shippingAddress: form,
      paymentMethod,
      notes: notes || null,
    }),
    onSuccess: (res) => {
      toast.success(t('checkout.orderSuccess'));
      resetCart();
      navigate(`/orders/${res.data.data._id}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || t('errors.unknown')),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    placeOrder.mutate();
  };

  if (!items.length) {
    return (
      <div className="section">
        <div className="container-app max-w-lg text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="section-title mb-2">{t('cart.empty')}</h2>
          <p className="text-neutral-500 mb-6">{t('cart.emptyDesc')}</p>
          <Link to="/store" className="btn-primary">{t('cart.continueShopping')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container-app max-w-5xl">
        <h1 className="section-title mb-8">{t('checkout.title')}</h1>
        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left — form */}
            <div className="lg:col-span-3 space-y-6">
              {/* Shipping */}
              <div className="card p-6">
                <h2 className="font-display font-semibold text-lg text-neutral-800 mb-5">{t('checkout.shippingAddress')}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">{t('checkout.fullName')}</label>
                    <input className={`input ${errors.fullName ? 'input-error' : ''}`}
                      value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})}/>
                    {errors.fullName && <p className="error-text">{errors.fullName}</p>}
                  </div>
                  <div>
                    <label className="label">{t('checkout.phone')}</label>
                    <input className={`input ${errors.phone ? 'input-error' : ''}`} type="tel"
                      value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/>
                    {errors.phone && <p className="error-text">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="label">{t('checkout.city')}</label>
                    <select className={`input ${errors.city ? 'input-error' : ''}`}
                      value={form.city} onChange={e => setForm({...form, city: e.target.value})}>
                      <option value="">{t('checkout.city')}</option>
                      {EGYPT_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.city && <p className="error-text">{errors.city}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">{t('checkout.street')}</label>
                    <input className={`input ${errors.street ? 'input-error' : ''}`}
                      value={form.street} onChange={e => setForm({...form, street: e.target.value})}/>
                    {errors.street && <p className="error-text">{errors.street}</p>}
                  </div>
                  <div>
                    <label className="label">{t('checkout.state')}</label>
                    <input className="input" value={form.state} onChange={e => setForm({...form, state: e.target.value})}/>
                  </div>
                  <div>
                    <label className="label">{t('checkout.zip')} <span className="text-neutral-400 text-xs">({t('common.optional')})</span></label>
                    <input className="input" value={form.zip} onChange={e => setForm({...form, zip: e.target.value})}/>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="card p-6">
                <h2 className="font-display font-semibold text-lg text-neutral-800 mb-5">{t('checkout.paymentMethod')}</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map(({ value, label }) => (
                    <label key={value} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors
                      ${paymentMethod === value ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                      <input type="radio" name="payment" value={value} checked={paymentMethod === value}
                        onChange={() => setPaymentMethod(value)} className="hidden"/>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                        ${paymentMethod === value ? 'border-primary-500' : 'border-neutral-300'}`}>
                        {paymentMethod === value && <div className="w-2 h-2 rounded-full bg-primary-500"/>}
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="card p-6">
                <label className="label">{t('checkout.orderNotes')}</label>
                <textarea className="input resize-none" rows={3}
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder={t('common.optional')}/>
              </div>
            </div>

            {/* Right — summary */}
            <div className="lg:col-span-2">
              <div className="card p-6 sticky top-24">
                <h2 className="font-display font-semibold text-lg text-neutral-800 mb-5">{t('checkout.orderSummary')}</h2>
                <div className="space-y-3 mb-5">
                  {items.map(item => (
                    <div key={item._id || item.product?._id} className="flex gap-3">
                      <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                        {item.product?.image
                          ? <img src={`${URL_IMAGE}/api/images/${item.product.image}`} alt={item.product.name} className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center text-xl">💊</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 line-clamp-1">{item.product?.name}</p>
                        <p className="text-xs text-neutral-400">{t('common.quantity')}: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-neutral-800 shrink-0">
                        {(item.price * item.quantity).toFixed(0)} {t('common.currency')}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="divider my-4"/>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>{t('cart.subtotal')}</span>
                    <span>{subtotal.toFixed(0)} {t('common.currency')}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>{t('cart.shipping')}</span>
                    <span className={shipping === 0 ? 'text-primary-600 font-medium' : ''}>
                      {shipping === 0 ? t('cart.freeShipping') : `${shipping} ${t('common.currency')}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-neutral-900 text-base pt-2 border-t border-neutral-100">
                    <span>{t('cart.total')}</span>
                    <span>{total.toFixed(0)} {t('common.currency')}</span>
                  </div>
                </div>
                <button type="submit" disabled={placeOrder.isPending}
                  className="btn-primary w-full justify-center py-3 text-base mt-5">
                  {placeOrder.isPending ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                        <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      {t('checkout.processing')}
                    </>
                  ) : t('checkout.placeOrder')}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}