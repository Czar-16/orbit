export const TIMEZONE = "Asia/Kolkata";
const kolkataDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function localDate(now = new Date()) {
  return kolkataDate.format(now);
}
export function todayInterval(now = new Date()) {
  const date = localDate(now);
  const start = new Date(`${date}T00:00:00+05:30`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
