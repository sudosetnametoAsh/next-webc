/** Database instants stay in UTC; campus-facing dates and times use Manila. */
export const APP_TIME_ZONE = "Asia/Manila";

export function campusDateInput(value: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((entry) => entry.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function campusEndOfDay(date: string): string {
  return new Date(`${date}T23:59:59+08:00`).toISOString();
}
