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
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import cs from "./locales/cs.json";
import ja from "./locales/ja.json";
import tr from "./locales/tr.json";
import uk from "./locales/uk.json";
import sv from "./locales/sv.json";
import no from "./locales/no.json";
import hu from "./locales/hu.json";
import ko from "./locales/ko.json";

export const languages = [
  { code: "en", name: "English" },
  { code: "cs", name: "Čeština" },
  { code: "nl", name: "Nederlands" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "hu", name: "Magyar" },
  { code: "it", name: "Italiano" },
  { code: "no", name: "Norsk" },
  { code: "pl", name: "Polski" },
  { code: "pt", name: "Português" },
  { code: "es", name: "Español" },
  { code: "sv", name: "Svenska" },
  { code: "tr", name: "Türkçe" },
  { code: "ja", name: "日本語" },
  { code: "zh", name: "简体中文" },
  { code: "ko", name: "한국어" },
  { code: "uk", name: "Українська" },
  { code: "ru", name: "Русский" }
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
      zh: { translation: zh },
      nl: { translation: nl },
      pl: { translation: pl },
      cs: { translation: cs },
      ja: { translation: ja },
      tr: { translation: tr },
      uk: { translation: uk },
      sv: { translation: sv },
      no: { translation: no },
      hu: { translation: hu },
      ko: { translation: ko }
    },
    fallbackLng: { nb: ["no", "en"], default: ["en"] },
    supportedLngs: [...languages.map(({ code }) => code), "nb"],
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
