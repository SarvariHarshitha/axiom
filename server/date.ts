import { env } from "./env.js";

/** "Today" computed in APP_TIMEZONE (default Asia/Kolkata), independent of machine TZ. */
export function todayInAppTimezone(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: env.APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date()); // en-CA formats as YYYY-MM-DD
}
