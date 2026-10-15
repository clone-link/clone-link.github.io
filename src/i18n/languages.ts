export interface Language {
  code: string;
  badge: string;
  label: string;
  dir?: 'ltr' | 'rtl';
}

export const supportedLanguages: Language[] = [
  { code: 'en', badge: 'US', label: 'English' },
  { code: 'es', badge: 'ES', label: 'Español' },
  { code: 'pt', badge: 'BR', label: 'Português' },
  { code: 'de', badge: 'DE', label: 'Deutsch' },
  { code: 'fr', badge: 'FR', label: 'Français' },
  { code: 'ja', badge: 'JP', label: '日本語' },
  { code: 'zh', badge: 'CN', label: '简体中文' },
];

export const defaultLang = 'en';

export type SupportedLanguageCode = 'en' | 'es' | 'pt' | 'de' | 'fr' | 'ja' | 'zh';
