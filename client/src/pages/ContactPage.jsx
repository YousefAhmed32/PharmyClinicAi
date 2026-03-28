import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success(t('contact.messageSent'));
    setForm({ name: '', email: '', message: '' });
  };

  const info = [
    { icon: '📍', title: t('common.address'), info: '123 Health Street, Cairo, Egypt' },
    { icon: '📞', title: t('common.phone'),   info: '+20 100 123 4567' },
    { icon: '✉️', title: t('common.email'),   info: 'support@pharmyclinic.com' },
    { icon: '🕒', title: t('common.notes'),   info: 'Sun–Thu 9am–5pm | Sat 9am–2pm' },
  ];

  return (
    <div className="section">
      <div className="container-app max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="section-title">{t('contact.title')}</h1>
          <p className="section-subtitle">{t('contact.getInTouch')}</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            {info.map(({ icon, title, info: val }) => (
              <div key={title} className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-2xl shrink-0">{icon}</div>
                <div>
                  <p className="font-semibold text-neutral-800">{title}</p>
                  <p className="text-neutral-500 text-sm">{val}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">{t('common.name')}</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required/>
              </div>
              <div>
                <label className="label">{t('common.email')}</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required/>
              </div>
              <div>
                <label className="label">{t('contact.message')}</label>
                <textarea className="input" rows={5} value={form.message} onChange={e => setForm({...form, message: e.target.value})} required/>
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3">
                {t('contact.sendMessage')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}