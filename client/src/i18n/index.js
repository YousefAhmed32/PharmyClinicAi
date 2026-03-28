import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ar from './locales/ar.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    fallbackLng:   'ar',
    supportedLngs: ['ar', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      order:              ['localStorage', 'navigator'],
      caches:             ['localStorage'],
      lookupLocalStorage: 'pharma_lang',
    },
  });

// Apply RTL/LTR direction on language change
const applyDir = (lng) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir',  dir);
  document.documentElement.setAttribute('lang', lng);
  document.body.classList.remove('rtl', 'ltr');
  document.body.classList.add(dir);
};

i18n.on('languageChanged', applyDir);

// Apply on initial load
applyDir(i18n.language || 'ar');

// Expose instance globally so axios interceptors can access t() outside React
window.__i18n__ = i18n;

export default i18n;
