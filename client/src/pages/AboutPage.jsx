import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function AboutPage() {
  const { t } = useTranslation();
  const cards = [
    { title: t('about.mission'), icon: '🎯', desc: t('home.feature1Desc') },
    { title: t('about.values'),  icon: '🔭', desc: t('home.feature2Desc') },
    { title: t('about.values'),  icon: '💚', desc: t('home.feature4Desc') },
    { title: t('about.team'),    icon: '👩‍⚕️', desc: t('home.feature2Desc') },
  ];
  return (
    <div className="section">
      <div className="container-app max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="section-title">{t('about.title')}</h1>
          <p className="section-subtitle mx-auto max-w-2xl">{t('home.whyDesc')}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-8 mb-16">
          {cards.map(({ title, icon, desc }, i) => (
            <div key={i} className="card p-6">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-display font-semibold text-xl mb-2">{title}</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="gradient-primary rounded-3xl p-10 text-center text-white">
          <h2 className="font-display text-2xl font-bold mb-4">{t('home.ctaTitle')}</h2>
          <Link to="/register" className="bg-white text-primary-700 font-semibold px-8 py-3 rounded-xl hover:bg-primary-50 transition-colors inline-block">
            {t('home.ctaBtn')}
          </Link>
        </div>
      </div>
    </div>
  );
}