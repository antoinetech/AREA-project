import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationFR from './locales/fr/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  fr: {
    translation: translationFR,
  },
};

i18n
  .use(LanguageDetector) // Détecte la langue du navigateur
  .use(initReactI18next) // Liaison avec React
  .init({
    resources,
    fallbackLng: 'en', // Langue par défaut si la détection échoue
    interpolation: {
      escapeValue: false, // React s'occupe déjà de l'échappement
    },
  });

export default i18n;
