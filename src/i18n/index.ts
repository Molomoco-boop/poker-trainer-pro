import { useEffect } from 'react';
import { LanguagePref, SupportedLang } from '../types/poker';
import { useGame } from '../context/useGame';
import { DICTIONARIES, Translations } from './translations';

export const SUPPORTED_LANGS: SupportedLang[] = ['en', 'es', 'pt', 'fr', 'de', 'it', 'ru', 'zh', 'ja', 'ko'];

export const LANG_LABELS: Record<SupportedLang, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ko: '한국어'
};

export function detectDeviceLang(): SupportedLang {
  if (typeof navigator === 'undefined') return 'en';
  const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
  for (const raw of list) {
    if (!raw) continue;
    const base = raw.toLowerCase().split(/[-_]/)[0];
    if (SUPPORTED_LANGS.includes(base as SupportedLang)) {
      return base as SupportedLang;
    }
  }
  return 'en';
}

export function resolveLang(pref?: LanguagePref): SupportedLang {
  if (!pref || pref === 'auto') return detectDeviceLang();
  return SUPPORTED_LANGS.includes(pref) ? pref : 'en';
}

export function useI18n(): { t: Translations; lang: SupportedLang; pref: LanguagePref } {
  const { stats } = useGame();
  const pref: LanguagePref = stats.preferences.language || 'auto';
  const lang = resolveLang(pref);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  return { t: DICTIONARIES[lang], lang, pref };
}
