import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8">
        <span className="font-display font-bold text-[9rem] leading-none text-neutral-100 select-none">404</span>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-3xl bg-primary-100 flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#339966" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="12"/><line x1="11" y1="16" x2="11.01" y2="16" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>
      <h1 className="font-display text-2xl font-semibold text-neutral-800 mb-3">{t('errors.pageNotFound')}</h1>
      <p className="text-neutral-500 mb-8 max-w-sm">{t('errors.pageNotFoundDesc')}</p>
      <div className="flex gap-3">
        <Link to="/"      className="btn-primary">{t('errors.goHome')}</Link>
        <Link to="/store" className="btn-secondary">{t('nav.store')}</Link>
      </div>
    </div>
  );
}