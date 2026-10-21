import { getLanguage } from "../i18n";

export default function joinNaturalLanguage(items: any[]): string {
  return new Intl.ListFormat(getLanguage(), {
    style: "long",
    type: "conjunction"
  }).format(items.map(String));
}
