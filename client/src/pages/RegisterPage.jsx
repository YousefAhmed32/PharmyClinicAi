import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [form, setForm]         = useState({ name: '', email: '', password: '', confirm: '', phone: '' });
  const [errors, setErrors]     = useState({});
  const [showPass, setShowPass] = useState(false);
  const [step, setStep]         = useState(1);

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim())   e.name  = t('auth.nameRequired');
    else if (form.name.trim().length < 2) e.name = t('auth.nameRequired');
    if (!form.email)         e.email = t('auth.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t('auth.invalidEmail');
    return e;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.password) e.password = t('auth.passwordRequired');
    else if (form.password.length < 8) e.password = t('auth.passwordRequired');
    if (form.password !== form.confirm) e.confirm = t('auth.passwordMismatch');
    return e;
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateStep2();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    const result = await register({
      name: form.name.trim(),
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
    });

    if (result.success) {
      toast.success(t('auth.registerSuccess'));
      navigate('/');
    } else {
      if (result.errors?.length) {
        const fieldErrors = {};
        result.errors.forEach(({ field, message }) => { fieldErrors[field] = message; });
        setErrors(fieldErrors);
      }
      toast.error(result.message);
    }
  };

  const passwordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8)          score++;
    if (/[A-Z]/.test(pwd))        score++;
    if (/[a-z]/.test(pwd))        score++;
    if (/\d/.test(pwd))           score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const strength = passwordStrength(form.password);
  const strengthLabels = ['', t('common.warning'), t('common.warning'), t('common.success'), t('common.success'), t('common.success')];
  const strengthColor  = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-primary-500', 'bg-primary-600'][strength];

  const features = [
    { icon: '💊', title: t('home.stat1Value') + ' ' + t('home.stat1Label'), desc: t('store.title') },
    { icon: '📅', title: t('nav.appointments'), desc: t('appointments.selectDate') },
    { icon: '💬', title: t('nav.supportChat'), desc: t('chat.online') },
    { icon: '📦', title: t('nav.orders'), desc: t('orders.trackOrder') },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Left decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(51,153,102,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(255,123,16,0.08) 0%, transparent 50%)' }} />
        </div>
        <div className="relative z-10 max-w-sm">
          <h2 className="font-display text-4xl font-semibold text-white mb-6 leading-tight">
            {t('home.ctaTitle')} <span className="text-primary-400">✓</span>
          </h2>
          <div className="space-y-4 mt-10">
            {features.map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-white font-medium text-sm">{title}</p>
                  <p className="text-neutral-400 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
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
            <h2 className="font-display text-3xl font-semibold text-neutral-900">{t('auth.createAccount')}</h2>
            <p className="text-neutral-500 mt-2 text-sm">{t('auth.signUpDesc')}</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map((s) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 ${step >= s ? 'text-primary-700' : 'text-neutral-400'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${step > s ? 'bg-primary-600 text-white' : step === s ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500' : 'bg-neutral-100 text-neutral-400'}`}>
                    {step > s ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                    ) : s}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">
                    {s === 1 ? t('profile.personalInfo') : t('profile.changePassword')}
                  </span>
                </div>
                {s < 2 && <div className={`flex-1 h-px ${step > s ? 'bg-primary-400' : 'bg-neutral-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-5 animate-fade-in" noValidate>
              <div>
                <label className="label">{t('auth.fullName')}</label>
                <input type="text" placeholder="Ahmed Mohamed"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`input ${errors.name ? 'input-error' : ''}`} autoFocus
                />
                {errors.name && <p className="error-text">{errors.name}</p>}
              </div>
              <div>
                <label className="label">{t('auth.email')}</label>
                <input type="email" placeholder="you@example.com"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`input ${errors.email ? 'input-error' : ''}`}
                />
                {errors.email && <p className="error-text">{errors.email}</p>}
              </div>
              <div>
                <label className="label">{t('auth.phone')} <span className="text-neutral-400 font-normal">({t('common.optional')})</span></label>
                <input type="tel" placeholder="+20 1xx xxx xxxx"
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                />
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3 text-base">
                {t('common.next')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in" noValidate>
              <div>
                <label className="label">{t('auth.password')}</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} placeholder="Min 8 characters"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={`input pe-11 ${errors.password ? 'input-error' : ''}`} autoFocus
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      {showPass
                        ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      }
                    </svg>
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-neutral-200'}`} />
                      ))}
                    </div>
                    <p className={`text-xs mt-1 ${strength <= 2 ? 'text-red-500' : strength <= 3 ? 'text-yellow-600' : 'text-primary-600'}`}>
                      {strengthLabels[strength]}
                    </p>
                  </div>
                )}
                {errors.password && <p className="error-text">{errors.password}</p>}
              </div>
              <div>
                <label className="label">{t('auth.confirmPassword')}</label>
                <input type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className={`input ${errors.confirm ? 'input-error' : ''}`}
                />
                {errors.confirm && <p className="error-text">{errors.confirm}</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center py-3">
                  {t('common.back')}
                </button>
                <button type="submit" disabled={isLoading} className="btn-primary flex-1 justify-center py-3">
                  {isLoading ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                  ) : t('auth.createAccount')}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-neutral-500 mt-6">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}