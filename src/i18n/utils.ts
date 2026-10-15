import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import { defaultLang, supportedLanguages, type SupportedLanguageCode } from './languages';

export const translations = {
  en,
  es,
  pt,
  de,
  fr,
  ja,
  zh,
} as const;

export type TranslationKey = keyof typeof en;

export function getLangFromUrl(url: URL): SupportedLanguageCode {
  const [, lang] = url.pathname.split('/');
  if (lang && lang in translations) {
    return lang as SupportedLanguageCode;
  }
  return defaultLang as SupportedLanguageCode;
}

export function useTranslations(lang: SupportedLanguageCode) {
  return translations[lang] || translations[defaultLang];
}

export function getLocalizedPath(pathname: string, lang: SupportedLanguageCode): string {
  // Strip any leading locale prefix
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && segments[0] in translations) {
    segments.shift();
  }
  
  const cleanPath = segments.length > 0 ? `/${segments.join('/')}` : '';
  
  if (lang === defaultLang) {
    return cleanPath || '/';
  }
  return `/${lang}${cleanPath}`;
}
