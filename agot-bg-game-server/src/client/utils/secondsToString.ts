import { t } from "../i18n";

export function secondsToString(
  seconds: number,
  includeSecondsInString = false
): string {
  const sliceEnd = includeSecondsInString ? 19 : 16;
  const hhmm = new Date(seconds * 1000).toISOString().slice(11, sliceEnd);
  const days = Math.round(seconds / (3600 * 24));

  return days <= 0 ? hhmm : t("common.duration", { count: days, time: hhmm });
}
