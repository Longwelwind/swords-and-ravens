import en from "./locales/en.json";
import { t } from ".";

const messages = Object.entries(en.gameText) as [
  keyof typeof en.gameText,
  string
][];
const exactMessages = new Map(
  messages
    .filter(([, text]) => !text.includes("{{"))
    .map(([key, text]) => [text, key])
);
const templates = messages
  .filter(([, text]) => text.includes("{{"))
  .map(([key, text]) => {
    const countVariable =
      `${key}_other` in en.gameText
        ? text.match(/\{\{(\w+)}} Power token\{\{\w+}}/)?.[1]
        : undefined;
    const names: string[] = [];
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = escaped.replace(
      /\\\{\\\{(\w+)\\\}\\\}/g,
      (_match, name: string) => {
        names.push(name);
        return name === countVariable ? "(\\d+)" : "([\\s\\S]*?)";
      }
    );
    return { key, names, countVariable, pattern: new RegExp(`^${pattern}$`) };
  });

// Keep serialized state and rule comparisons in English; translate only at presentation.
export default function translateGameText<T extends string | null | undefined>(
  text: T
): string | T {
  if (text == null) return text;
  const key = exactMessages.get(text);
  if (key) return t(`gameText.${key}`);

  for (const template of templates) {
    const match = template.pattern.exec(text);
    if (match) {
      const values = Object.fromEntries(
        template.names.map((name, index) => [name, match[index + 1]])
      );
      return t(`gameText.${template.key}`, {
        ...values,
        ...(template.countVariable
          ? { count: Number(values[template.countVariable]) }
          : {})
      });
    }
  }
  return text;
}
