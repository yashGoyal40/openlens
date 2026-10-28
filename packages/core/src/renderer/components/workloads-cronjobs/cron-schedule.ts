/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import moment from "moment-timezone";

interface CronField {
  values: Set<number>;

  /**
   * "*" or "?", which matters for how day of month and day of week combine
   */
  isAny: boolean;
}

interface CronExpression {
  minutes: CronField;
  hours: CronField;
  daysOfMonth: CronField;
  months: CronField;
  daysOfWeek: CronField;
}

const macros: Partial<Record<string, string>> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function parseValue(value: string, names: string[], offset: number): number {
  const index = names.indexOf(value.toUpperCase());

  if (index >= 0) {
    return index + offset;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`invalid value "${value}"`);
  }

  return Number(value);
}

function parseField(field: string, min: number, max: number, names: string[] = [], offset = 0): CronField {
  const values = new Set<number>();

  for (const part of field.split(",")) {
    const [range, stepText] = part.split("/");
    const step = stepText === undefined ? 1 : Number(stepText);
    let start = min;
    let end = max;

    if (!Number.isInteger(step) || step < 1) {
      throw new Error(`invalid step in "${part}"`);
    }

    if (range !== "*" && range !== "?") {
      const [from, to] = range.split("-");

      start = parseValue(from, names, offset);
      end = to === undefined
        ? (stepText === undefined ? start : max)
        : parseValue(to, names, offset);
    }

    if (start < min || end > max || start > end) {
      throw new Error(`"${part}" is out of range`);
    }

    for (let value = start; value <= end; value += step) {
      values.add(value);
    }
  }

  return { values, isAny: field === "*" || field === "?" };
}

/**
 * Parses the five fields of a Kubernetes CronJob schedule, or returns undefined when it is not understood
 */
export function parseCronSchedule(schedule: string): CronExpression | undefined {
  const expanded = macros[schedule.trim().toLowerCase()] ?? schedule;
  const fields = expanded.trim().split(/\s+/);

  if (fields.length !== 5) {
    return undefined;
  }

  try {
    const daysOfWeek = parseField(fields[4], 0, 7, dayNames);

    // both 0 and 7 are Sunday
    if (daysOfWeek.values.delete(7)) {
      daysOfWeek.values.add(0);
    }

    return {
      minutes: parseField(fields[0], 0, 59),
      hours: parseField(fields[1], 0, 23),
      daysOfMonth: parseField(fields[2], 1, 31),
      months: parseField(fields[3], 1, 12, monthNames, 1),
      daysOfWeek,
    };
  } catch {
    return undefined;
  }
}

/**
 * Splits a "CRON_TZ=" or "TZ=" prefix off a schedule
 */
export function splitScheduleTimeZone(schedule: string): { schedule: string; timeZone?: string } {
  const match = /^(?:CRON_)?TZ=(\S+)\s+(.*)$/.exec(schedule.trim());

  return match
    ? { schedule: match[2], timeZone: match[1] }
    : { schedule };
}

const matchesDay = ({ daysOfMonth, daysOfWeek }: CronExpression, day: moment.Moment) => {
  const dayOfMonth = daysOfMonth.values.has(day.date());
  const dayOfWeek = daysOfWeek.values.has(day.day());

  // like cron, when both are restricted either one is enough
  if (!daysOfMonth.isAny && !daysOfWeek.isAny) {
    return dayOfMonth || dayOfWeek;
  }

  return dayOfMonth && dayOfWeek;
};

/**
 * Looks ahead far enough for leap days
 */
const maxYearsAhead = 5;

/**
 * When the schedule next fires after a point in time, in milliseconds, or undefined when it never does
 */
export function getNextExecution(schedule: string, after: number, timeZone = "UTC"): number | undefined {
  const { schedule: expression, timeZone: scheduleTimeZone } = splitScheduleTimeZone(schedule);
  const cron = parseCronSchedule(expression);
  const zone = scheduleTimeZone ?? timeZone;

  if (!cron || !moment.tz.zone(zone)) {
    return undefined;
  }

  const time = moment.tz(after, zone).startOf("minute").add(1, "minute");
  const limit = moment.tz(after, zone).add(maxYearsAhead, "years");

  while (time.isBefore(limit)) {
    if (!cron.months.values.has(time.month() + 1)) {
      time.add(1, "month").startOf("month");
    } else if (!matchesDay(cron, time)) {
      time.add(1, "day").startOf("day");
    } else if (!cron.hours.values.has(time.hour())) {
      time.add(1, "hour").startOf("hour");
    } else if (!cron.minutes.values.has(time.minute())) {
      time.add(1, "minute");
    } else {
      return time.valueOf();
    }
  }

  return undefined;
}

const units = [
  { name: "day", size: 24 * 60 * 60 * 1000 },
  { name: "hour", size: 60 * 60 * 1000 },
  { name: "minute", size: 60 * 1000 },
  { name: "second", size: 1000 },
];

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;

/**
 * Such as "In 18 minutes 40 seconds" or "In about 4 days 20 hours"
 */
export function formatTimeUntil(duration: number): string {
  let rest = Math.max(0, duration);
  const parts = units.map(({ name, size }) => {
    const count = Math.floor(rest / size);

    rest -= count * size;

    return { name, count };
  });
  const largest = parts.findIndex(({ count }) => count > 0);

  if (largest === -1) {
    return "In less than a second";
  }

  const [first, second] = parts.slice(largest, largest + 2);
  const text = [first, second]
    .filter(part => part && part.count > 0)
    .map(({ name, count }) => plural(count, name))
    .join(" ");

  // seconds are left out of hours and days, so those are approximate
  return first.name === "day" || first.name === "hour"
    ? `In about ${text}`
    : `In ${text}`;
}

/**
 * Such as "Today at 5:17 PM (Local time zone - Asia/Calcutta, UTC+05:30)"
 */
export function formatExecutionTime(time: number, timeZone: string, label: string, now: number): string {
  const when = moment.tz(time, timeZone);
  const today = moment.tz(now, timeZone).startOf("day");
  const day = when.clone().startOf("day");
  const dayText = day.isSame(today)
    ? "Today"
    : day.isSame(today.clone().add(1, "day"))
      ? "Tomorrow"
      : when.format("ddd, D MMM YYYY");

  return `${dayText} at ${when.format("h:mm A")} (${label} - ${timeZone}, UTC${when.format("Z")})`;
}
