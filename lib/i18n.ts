/**
 * i18next configuration — all locale resources bundled at build time.
 * Language changes are driven by LanguageContext (contexts/LanguageContext.tsx).
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import he from '../locales/he.json';
import fr from '../locales/fr.json';
import ru from '../locales/ru.json';
import es from '../locales/es.json';
import uk from '../locales/uk.json';
import de from '../locales/de.json';
import zh from '../locales/zh.json';
import pt from '../locales/pt.json';
import it from '../locales/it.json';

// Guard: init only once (Next.js HMR can re-import this module)
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        he: { translation: he },
        fr: { translation: fr },
        ru: { translation: ru },
        es: { translation: es },
        uk: { translation: uk },
        de: { translation: de },
        zh: { translation: zh },
        pt: { translation: pt },
        it: { translation: it },
      },
      lng: 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // React already handles XSS
      },
      // Keep i18next from printing warnings for missing keys that exist in translations.ts fallback
      missingKeyHandler: false,
    });
}

export default i18n;

/** RTL languages supported by the app */
export const RTL_LANGUAGES = new Set(['he', 'ar']);

export type SupportedLanguage = 'en' | 'he' | 'fr' | 'ru' | 'es' | 'uk' | 'de' | 'zh' | 'pt' | 'it';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'he', 'fr', 'ru', 'es', 'uk', 'de', 'zh', 'pt', 'it'];

/** Map browser locale codes to our supported language codes */
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language?.toLowerCase() ?? '';
  // Exact match first
  if ((SUPPORTED_LANGUAGES as string[]).includes(lang)) return lang as SupportedLanguage;
  // Prefix match (e.g. 'he-IL' → 'he')
  const prefix = lang.split('-')[0];
  if ((SUPPORTED_LANGUAGES as string[]).includes(prefix)) return prefix as SupportedLanguage;
  return 'en';
}
