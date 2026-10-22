import { getLanguage, t } from ".";

export function formatRelativeTime(date: Date, now: Date): string {
  const seconds = (date.getTime() - now.getTime()) / 1000;
  if (seconds <= 0 && seconds > -60) {
    return t("chat.aFewSecondsAgo");
  }
  const [divisor, unit]: [number, Intl.RelativeTimeFormatUnit] =
    Math.abs(seconds) < 60
      ? [1, "second"]
      : Math.abs(seconds) < 3600
        ? [60, "minute"]
        : [3600, "hour"];
  return new Intl.RelativeTimeFormat(getLanguage(), { numeric: "auto" }).format(
    Math.round(seconds / divisor),
    unit
  );
}
