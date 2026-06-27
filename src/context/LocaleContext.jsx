import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { dictionaries } from '../i18n/dictionaries';

const LocaleContext = createContext();

export const useLocale = () => useContext(LocaleContext);

const STORAGE_KEY = 'novora_lang';

const resolve = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

export const LocaleProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    const stored = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
    return stored === 'ar' || stored === 'en' ? stored : 'en';
  });

  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  // Keep <html lang/dir> in sync so RTL + font switching work app-wide.
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('lang', lang);
    el.setAttribute('dir', dir);
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  // t('nav.dashboard') -> string. Falls back to the key if missing.
  const t = useCallback(
    (key) => {
      const val = resolve(dictionaries[lang], key);
      if (val != null) return val;
      const fallback = resolve(dictionaries.en, key);
      return fallback != null ? fallback : key;
    },
    [lang]
  );

  const toggleLang = useCallback(() => setLang((l) => (l === 'ar' ? 'en' : 'ar')), []);

  return (
    <LocaleContext.Provider value={{ lang, isAr, dir, t, setLang, toggleLang }}>
      {children}
    </LocaleContext.Provider>
  );
};
