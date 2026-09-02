import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { applyDayLocale } from "./dayjs-locale";
import { translations, type Locale, type TranslationKey } from "./translations";

const LOCALE_KEY = "loanapp.locale";

export type { Locale, TranslationKey };

export function translate(locale: Locale, key: TranslationKey): string {
  return translations[locale][key];
}

export function formatTemplate(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

interface LocaleState {
  locale: Locale;
  ready: boolean;
  setLocale: (locale: Locale) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: "rw",
  ready: false,

  setLocale: async (locale) => {
    await AsyncStorage.setItem(LOCALE_KEY, locale).catch(() => undefined);
    applyDayLocale(locale);
    set({ locale });
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(LOCALE_KEY);
      const locale: Locale = stored === "en" || stored === "rw" ? stored : "rw";
      applyDayLocale(locale);
      set({ locale, ready: true });
    } catch {
      const locale: Locale = "rw";
      applyDayLocale(locale);
      set({ locale, ready: true });
    }
  },
}));

export function getLocale(): Locale {
  return useLocaleStore.getState().locale;
}

/** Imperative translation read (uses the current store locale). */
export function t(key: TranslationKey): string {
  return translate(getLocale(), key);
}

/** Imperative translation with `{var}` interpolation. */
export function tpl(key: TranslationKey, vars: Record<string, string | number>): string {
  return formatTemplate(t(key), vars);
}

/** Reactive translation function for components. */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return useCallback((key: TranslationKey) => translate(locale, key), [locale]);
}

/** Reactive `{var}` interpolation for components. */
export function useTpl() {
  const tt = useT();
  return useCallback(
    (key: TranslationKey, vars: Record<string, string | number>) => formatTemplate(tt(key), vars),
    [tt],
  );
}