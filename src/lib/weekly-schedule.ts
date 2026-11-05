import type { WeeklySchedule } from "@/modules/staff/application/repository/schedule-repository";

export const WEEK_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export function campusClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  }).formatToParts(now);
  const part = (key: string) => parts.find((p) => p.type === key)!.value;
  const dayKey = part("weekday").toLowerCase() as typeof WEEK_DAYS[number];
  return { dayKey, dayIndex: WEEK_DAYS.indexOf(dayKey), date: `${part("year")}-${part("month")}-${part("day")}`, minutes: Number(part("hour")) * 60 + Number(part("minute")) };
}
const validTime = (t: unknown): t is string => typeof t === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(t);
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export function validateWeeklySchedule(value: unknown): WeeklySchedule {
  if (!value || typeof value !== "object" || Array.isArray(value) || !Object.keys(value).length) throw new Error("A weekly schedule is required.");
  if (Object.keys(value).some((key) => !WEEK_DAYS.includes(key as typeof WEEK_DAYS[number]))) throw new Error("Invalid schedule day.");
  const input = value as WeeklySchedule;
  const result: WeeklySchedule = {};
  for (const key of WEEK_DAYS) {
    const day = input[key];
    if (day === undefined) { result[key] = { active: false, time_in: "08:00", time_out: "17:00" }; continue; }
    if (!day || typeof day.active !== "boolean") throw new Error(`Invalid schedule for ${key}.`);
    if (day.active && (!validTime(day.time_in) || !validTime(day.time_out) || minutes(day.time_out) <= minutes(day.time_in))) throw new Error(`Closing time must follow a valid opening time for ${key}.`);
    result[key] = { active: day.active, time_in: validTime(day.time_in) ? day.time_in.slice(0, 5) : "08:00", time_out: validTime(day.time_out) ? day.time_out.slice(0, 5) : "17:00" };
  }
  return result;
}
export const hasWeeklySchedule = (schedule?: WeeklySchedule | null) => Boolean(schedule && Object.keys(schedule).length);
export function formatOfficeTime(time: string) {
  const hour = Number(time.slice(0, 2));
  return `${hour % 12 || 12}:${time.slice(3, 5)} ${hour >= 12 ? "PM" : "AM"}`;
}
export function officeStatus(schedule?: WeeklySchedule | null, earlyOutDate?: string | null, now = new Date()) {
  const clock = campusClock(now);
  const day = schedule?.[clock.dayKey];
  const hasSchedule = hasWeeklySchedule(schedule);
  const active = Boolean(day?.active && validTime(day.time_in) && validTime(day.time_out));
  const base = { isOpen: false, hasSchedule, hasHoursToday: active, timeRange: active ? `${formatOfficeTime(day!.time_in)} – ${formatOfficeTime(day!.time_out)}` : hasSchedule ? "Closed" : "Pending schedule" };
  if (!hasSchedule) return { ...base, schedule: "Pending schedule" };
  if (earlyOutDate === clock.date) return { ...base, schedule: "Closed early today" };
  if (!active) return { ...base, schedule: "Closed today" };
  const start = minutes(day!.time_in), end = minutes(day!.time_out);
  if (clock.minutes < start) return { ...base, schedule: `Closed · Opens at ${formatOfficeTime(day!.time_in)}` };
  if (clock.minutes >= end) return { ...base, schedule: "Closed for today" };
  if (clock.minutes >= 720 && clock.minutes < 780) return { ...base, schedule: end > 780 ? "Lunch break · Resumes at 1:00 PM" : "Lunch break · Closed for today" };
  return { ...base, isOpen: true, schedule: `Open now · Closes ${formatOfficeTime(day!.time_out)}` };
}
