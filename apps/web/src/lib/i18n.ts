import enMessages from '@/locales/en.json';
import msMessages from '@/locales/ms.json';

/**
 * i18n utility for the IMS application.
 * Supports English (en) and Bahasa Malaysia (ms).
 */

export type Locale = 'en' | 'ms';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'ms'];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ms: 'Bahasa Malaysia',
};

export const DEFAULT_LOCALE: Locale = 'en';

const LOCALE_STORAGE_KEY = 'ims-locale';

type Messages = Record<string, unknown>;

const messages: Record<Locale, Messages> = {
  en: enMessages,
  ms: msMessages,
};

/**
 * Get the stored locale from localStorage, falling back to the default.
 */
export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
    return stored as Locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Store the locale preference in localStorage.
 */
export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

/**
 * Look up a translation by a dot-separated key path.
 * Supports nested keys like 'nav.dashboard' or 'items.addItem'.
 *
 * @param key - Dot-separated key path (e.g., 'common.save', 'nav.dashboard')
 * @param locale - The locale to use for the lookup
 * @param params - Optional parameters for interpolation (e.g., { field: 'Name' })
 * @returns The translated string, or the key itself if not found
 *
 * @example
 * ```ts
 * t('common.save', 'en')           // "Save"
 * t('common.save', 'ms')           // "Simpan"
 * t('errors.required', 'en', { field: 'Name' }) // "Name is required"
 * ```
 */
export function t(key: string, locale: Locale, params?: Record<string, string | number>): string {
  const parts = key.split('.');
  let current: unknown = messages[locale];

  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== 'object') {
      // Key not found, return the key itself as fallback
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current !== 'string') {
    // Key resolved to a non-string (e.g., an object), return key
    return key;
  }

  // Handle parameter interpolation: replace {param} patterns
  if (params) {
    let result = current;
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }
    return result;
  }

  return current;
}

/**
 * Check if a translation key exists for a given locale.
 */
export function hasTranslation(key: string, locale: Locale): boolean {
  const parts = key.split('.');
  let current: unknown = messages[locale];

  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string';
}

/**
 * Get all translations for a namespace (e.g., 'common', 'nav').
 * Returns the full object for that namespace.
 */
export function getNamespace(namespace: string, locale: Locale): Record<string, string> {
  const data = messages[locale];
  const ns = data[namespace];

  if (ns && typeof ns === 'object' && !Array.isArray(ns)) {
    return ns as Record<string, string>;
  }

  return {};
}
