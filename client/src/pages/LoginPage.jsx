import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = t('auth.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t('auth.invalidEmail');
    if (!form.password) e.password = t('auth.passwordRequired');
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success(t('auth.loginSuccess'));
      navigate(from, { replace: true });
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Left — decorative */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-primary-200/40"
              style={{ width:`${80+i*40}px`, height:`${80+i*40}px`, top:`${10+i*12}%`, left:`${-10+i*15}%` }}
            />
          ))}
        </div>
        <div className="relative z-10 max-w-md text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary-600 mx-auto mb-8 flex items-center justify-center shadow-green">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white" fillOpacity="0.95">
              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
            </svg>
          </div>
          <h1 className="section-title mb-4">{t('home.heroTitle')} {t('home.heroTitleHighlight')}</h1>
          <p className="section-subtitle">{t('home.heroDesc')}</p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { value: t('home.stat1Value'), label: t('home.stat1Label') },
              { value: t('home.stat3Value'), label: t('home.stat3Label') },
              { value: t('home.stat2Value'), label: t('home.stat2Label') },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-soft">
                <div className="font-display font-bold text-2xl text-primary-700">{value}</div>
                <div className="text-xs text-neutral-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
                </svg>
              </div>
              <span className="font-display font-semibold text-neutral-900">{t('common.appName')}</span>
            </Link>
            <h2 className="font-display text-3xl font-semibold text-neutral-900">{t('auth.welcomeBack')}</h2>
            <p className="text-neutral-500 mt-2 text-sm">{t('auth.signInDesc')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`input ${errors.email ? 'input-error' : ''}`}
                autoComplete="email"
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`input pe-11 ${errors.password ? 'input-error' : ''}`}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors">
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3 text-base">
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  {t('common.loading')}
                </>
              ) : t('auth.login')}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-500 mt-6">
            {t('auth.dontHaveAccount')}{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">
              {t('auth.register')}
            </Link>
          </p>

          <div className="mt-8 p-4 bg-primary-50 rounded-xl border border-primary-100">
            <p className="text-xs font-semibold text-primary-700 mb-2">🔐 Demo Credentials</p>
            <div className="space-y-1 text-xs text-primary-600 font-mono">
              <p>Admin: admin@pharmyclinic.com</p>
              <p>Pass: Admin@123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}