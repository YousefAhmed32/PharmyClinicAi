import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authAPI, ordersAPI } from '@/api/services';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending:'badge-yellow', confirmed:'badge-blue', processing:'badge-blue',
  shipped:'badge-orange', delivered:'badge-green', cancelled:'badge-red',
};

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm]     = useState({ name: user?.name||'', phone: user?.phone||'' });
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [pwErrors, setPwErrors] = useState({});

  const update = useMutation({
    mutationFn: (data) => authAPI.updateProfile(data),
    onSuccess: (res) => { updateUser(res.data.data); toast.success(t('profile.updateSuccess')); },
    onError: (err) => toast.error(err.response?.data?.message || t('errors.unknown')),
  });

  const changePassword = useMutation({
    mutationFn: (data) => authAPI.changePassword(data),
    onSuccess: () => {
      toast.success(t('profile.passwordChanged'));
      setPwForm({ currentPassword:'', newPassword:'', confirm:'' });
    },
    onError: (err) => toast.error(err.response?.data?.message || t('errors.unknown')),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['my-orders-profile'],
    queryFn:  () => ordersAPI.getMyOrders({ limit: 5 }).then(r => r.data.data),
    enabled:  activeTab === 'orders',
  });

  const validatePw = () => {
    const e = {};
    if (!pwForm.currentPassword)       e.currentPassword = t('common.required');
    if (pwForm.newPassword.length < 8) e.newPassword     = t('auth.passwordRequired');
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwForm.newPassword))
      e.newPassword = t('auth.passwordRequired');
    if (pwForm.newPassword !== pwForm.confirm) e.confirm = t('auth.passwordMismatch');
    return e;
  };

  const handlePwSubmit = (e) => {
    e.preventDefault();
    const errs = validatePw();
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwErrors({});
    changePassword.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  };

  const tabs = [
    { id: 'profile',  label: t('profile.personalInfo'), icon: '👤' },
    { id: 'orders',   label: t('orders.title'),          icon: '📦' },
    { id: 'security', label: t('profile.changePassword'),icon: '🔒' },
  ];

  return (
    <div className="section">
      <div className="container-app max-w-3xl">
        <h1 className="section-title mb-8">{t('profile.title')}</h1>

        {/* Profile header */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-2xl text-primary-700">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="font-display font-semibold text-xl text-neutral-900">{user?.name}</h2>
              <p className="text-neutral-500 text-sm">{user?.email}</p>
              <div className="flex gap-2 mt-2">
                <span className="badge-green capitalize">{user?.role}</span>
                {user?.phone && <span className="badge-gray">{user.phone}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Language switcher in profile */}
        <div className="card p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-800">{t('profile.language')}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {i18n.language === 'ar' ? t('profile.arabic') : t('profile.english')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => i18n.changeLanguage('ar')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                i18n.language === 'ar' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}>
              🇪🇬 {t('profile.arabic')}
            </button>
            <button
              onClick={() => i18n.changeLanguage('en')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                i18n.language === 'en' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}>
              🇺🇸 {t('profile.english')}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${activeTab === tab.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}>
              <span>{tab.icon}</span>
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="card p-6 space-y-4 animate-fade-in">
            <h3 className="font-semibold text-neutral-800">{t('profile.personalInfo')}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('auth.fullName')}</label>
                <input className="input" value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}/>
              </div>
              <div>
                <label className="label">{t('common.phone')}</label>
                <input className="input" value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})} placeholder="+20 xxx xxx xxxx"/>
              </div>
            </div>
            <div>
              <label className="label">
                {t('auth.email')} <span className="text-neutral-400 font-normal text-xs">({t('common.optional')})</span>
              </label>
              <input className="input bg-neutral-50" value={user?.email} disabled/>
            </div>
            <div className="flex justify-end">
              <button onClick={() => update.mutate(form)} disabled={update.isPending} className="btn-primary min-w-[130px]">
                {update.isPending ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        )}

        {/* Orders tab */}
        {activeTab === 'orders' && (
          <div className="animate-fade-in space-y-3">
            {!ordersData ? (
              <div className="card p-8 text-center"><div className="skeleton h-32 rounded-xl"/></div>
            ) : ordersData.length === 0 ? (
              <div className="card p-16 text-center">
                <p className="text-4xl mb-3">📦</p>
                <p className="font-semibold text-neutral-700">{t('orders.noOrders')}</p>
                <Link to="/store" className="btn-primary mt-4 inline-block">{t('nav.store')}</Link>
              </div>
            ) : (
              <>
                {ordersData.map(o => (
                  <Link key={o._id} to={`/orders/${o._id}`}
                    className="card-hover p-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-800 font-mono text-sm">{o.orderNumber}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {format(new Date(o.createdAt), 'dd MMM yyyy')} · {o.items.length} {t('cart.items')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={STATUS_COLORS[o.status] || 'badge-gray'}>
                        {t(`orders.statuses.${o.status}`) || o.status}
                      </span>
                      <p className="font-bold text-neutral-900 text-sm">{o.total?.toFixed(2)} {t('common.currency')}</p>
                    </div>
                  </Link>
                ))}
                <div className="text-center pt-2">
                  <Link to="/orders" className="btn-secondary">{t('common.seeAll')}</Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="card p-6 animate-fade-in">
            <h3 className="font-semibold text-neutral-800 mb-5">{t('profile.changePassword')}</h3>
            <form onSubmit={handlePwSubmit} className="space-y-4">
              <div>
                <label className="label">{t('profile.currentPassword')}</label>
                <input type="password" className={`input ${pwErrors.currentPassword ? 'input-error' : ''}`}
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm({...pwForm, currentPassword: e.target.value})}/>
                {pwErrors.currentPassword && <p className="error-text">{pwErrors.currentPassword}</p>}
              </div>
              <div>
                <label className="label">{t('profile.newPassword')}</label>
                <input type="password" className={`input ${pwErrors.newPassword ? 'input-error' : ''}`}
                  value={pwForm.newPassword}
                  onChange={e => setPwForm({...pwForm, newPassword: e.target.value})}/>
                {pwErrors.newPassword && <p className="error-text">{pwErrors.newPassword}</p>}
              </div>
              <div>
                <label className="label">{t('profile.confirmNewPassword')}</label>
                <input type="password" className={`input ${pwErrors.confirm ? 'input-error' : ''}`}
                  value={pwForm.confirm}
                  onChange={e => setPwForm({...pwForm, confirm: e.target.value})}/>
                {pwErrors.confirm && <p className="error-text">{pwErrors.confirm}</p>}
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={changePassword.isPending} className="btn-primary min-w-[150px]">
                  {changePassword.isPending ? t('common.loading') : t('profile.changePassword')}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-neutral-100">
              <h3 className="font-semibold text-neutral-800 mb-2">{t('profile.personalInfo')}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  [t('profile.memberSince'), user?.createdAt ? format(new Date(user.createdAt), 'dd MMM yyyy') : '—'],
                  [t('profile.lastActivity'), user?.lastLogin ? format(new Date(user.lastLogin), 'dd MMM yyyy') : '—'],
                  [t('common.status'), t('common.status')],
                  [t('common.name'), user?.role || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="bg-neutral-50 rounded-xl p-3">
                    <p className="text-xs text-neutral-400">{label}</p>
                    <p className="font-medium text-neutral-800 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}