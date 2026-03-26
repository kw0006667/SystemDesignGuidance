import zhTW from './zh-TW.js';
import type { Locale } from '../types.js';

type LocaleMap = Record<string, string>;

const locales: Record<Locale, LocaleMap> = {
  'zh-TW': zhTW,
};

export function t(key: string, locale: Locale = 'zh-TW'): string {
  return locales[locale]?.[key] ?? key;
}

export function getAvailableLocales(): Locale[] {
  return Object.keys(locales) as Locale[];
}
