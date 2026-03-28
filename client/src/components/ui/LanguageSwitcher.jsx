import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const isAr     = i18n.language === 'ar';

  const toggle = () => i18n.changeLanguage(isAr ? 'en' : 'ar');

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200
                  hover:border-primary-400 hover:bg-primary-50 transition-all text-sm font-medium
                  text-neutral-700 ${className}`}
      title={isAr ? 'Switch to English' : 'التبديل للعربية'}>
      <span className="text-base">{isAr ? '🇺🇸' : '🇪🇬'}</span>
      <span>{isAr ? 'EN' : 'ع'}</span>
    </button>
  );
}
