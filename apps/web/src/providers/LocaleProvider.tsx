'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  type Locale,
  DEFAULT_LOCALE,
  getStoredLocale,
  setStoredLocale,
  t as translate,
} from '@/lib/i18n';

interface LocaleContextValue {
  /** Current active locale */
  locale: Locale;
  /** Switch to a different locale */
  switchLocale: (locale: Locale) => void;
  /** Translation function - look up a key in the current locale */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
  /** Optional initial locale override (e.g., from server-side detection) */
  initialLocale?: Locale;
}

/**
 * Context provider for locale state.
 * Wraps the application to provide translation functions and locale switching.
 *
 * Usage:
 * ```tsx
 * // In root layout or providers
 * <LocaleProvider>
 *   <App />
 * </LocaleProvider>
 *
 * // In components
 * const { t, locale, switchLocale } = useTranslation();
 * return <span>{t('common.save')}</span>;
 * ```
 */
export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale || DEFAULT_LOCALE);

  // On mount, read locale from localStorage
  useEffect(() => {
    const stored = getStoredLocale();
    setLocale(stored);
  }, []);

  const switchLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    setStoredLocale(newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(key, locale, params);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, switchLocale, t }), [locale, switchLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Hook to access translation functions and current locale.
 *
 * @returns Object with `t()` function, `locale`, and `switchLocale()`
 * @throws Error if used outside of a LocaleProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, locale, switchLocale } = useTranslation();
 *   return (
 *     <div>
 *       <h1>{t('dashboard.title')}</h1>
 *       <p>Current: {locale}</p>
 *       <button onClick={() => switchLocale('ms')}>BM</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTranslation(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LocaleProvider');
  }
  return context;
}
