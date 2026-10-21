import i18n, { TOptions } from "i18next";
import { observable, runInAction } from "mobx";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import it from "./locales/it.json";
import fr from "./locales/fr.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";

export const languages = [
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "fr", name: "Français" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "zh", name: "简体中文" }
] as const;

export type Language = (typeof languages)[number]["code"];

type PluralSuffix = "zero" | "one" | "two" | "few" | "many" | "other";
type Keys<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K | (K extends `${infer Base}_${PluralSuffix}` ? Base : never)
    : `${K}.${Keys<T[K]>}`;
}[keyof T & string];

export type TranslationKey = Keys<typeof en>;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      es: { translation: es },
      it: { translation: it },
      fr: { translation: fr },
      pt: { translation: pt },
      ru: { translation: ru },
      zh: { translation: zh }
    },
    fallbackLng: "en",
    supportedLngs: languages.map(({ code }) => code),
    load: "languageOnly",
    initAsync: false,
    returnNull: false,
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "snr.game.language",
      caches: ["localStorage"]
    },
    react: {
      useSuspense: false,
      transSupportBasicHtmlNodes: false
    }
  });

function updateDocumentLanguage(): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang =
      i18n.resolvedLanguage === "zh"
        ? "zh-Hans"
        : (i18n.resolvedLanguage ?? "en");
  }
}

const currentLanguage = observable.box(i18n.resolvedLanguage ?? "en");

i18n.on("languageChanged", () => {
  runInAction(() => currentLanguage.set(i18n.resolvedLanguage ?? "en"));
  updateDocumentLanguage();
});
updateDocumentLanguage();

// The legacy class components observe MobX rather than React hooks.
export function getLanguage(): string {
  currentLanguage.get();
  return i18n.resolvedLanguage ?? "en";
}

export function t(key: TranslationKey, options?: TOptions): string {
  getLanguage();
  return i18n.t(key, options);
}

export { default as translateGameText } from "./translateGameText";
export { default as Trans } from "./Trans";
export { useTranslation } from "react-i18next";
export default i18n;
