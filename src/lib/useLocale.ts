"use client";

import { useState, useCallback, useEffect } from "react";
import { Locale, t as translate, TranslationKey } from "./i18n";

const LOCALE_CHANGE_EVENT = "locale-changed";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("ko");

  // Sync with localStorage after mount + listen for changes
  useEffect(() => {
    const saved = (localStorage.getItem("locale") as Locale) || "ko";
    setLocaleState(saved);

    function onLocaleChange() {
      const next = (localStorage.getItem("locale") as Locale) || "ko";
      setLocaleState(next);
    }
    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translate(key, locale),
    [locale]
  );

  return { locale, setLocale, t };
}
