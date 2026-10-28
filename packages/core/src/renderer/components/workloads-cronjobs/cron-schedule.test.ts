/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { formatExecutionTime, formatTimeUntil, getNextExecution, parseCronSchedule } from "./cron-schedule";

const at = (iso: string) => Date.parse(iso);
const next = (schedule: string, after: string, timeZone?: string) => {
  const time = getNextExecution(schedule, at(after), timeZone);

  return time === undefined ? undefined : new Date(time).toISOString();
};

describe("cron schedule", () => {
  describe("getNextExecution", () => {
    it("finds the next matching minute", () => {
      expect(next("*/5 * * * *", "2026-10-28T11:28:10Z")).toBe("2026-10-28T11:30:00.000Z");
    });

    it("skips the current minute even when it matches", () => {
      expect(next("47 * * * *", "2026-10-28T11:47:00Z")).toBe("2026-10-28T12:47:00.000Z");
    });

    it("moves on to the next day", () => {
      expect(next("17 20 * * *", "2026-10-28T21:00:00Z")).toBe("2026-10-29T20:17:00.000Z");
    });

    it("understands lists, ranges, steps and names", () => {
      expect(next("0 9-17/4 * * MON-FRI", "2026-10-30T18:00:00Z")).toBe("2026-11-02T09:00:00.000Z");
      expect(next("30 6 1,15 * *", "2026-10-02T00:00:00Z")).toBe("2026-10-15T06:30:00.000Z");
    });

    it("runs on either day when both day of month and day of week are given", () => {
      // the 1st of November 2026 is a Sunday, the 2nd a Monday
      expect(next("0 0 2 * 0", "2026-10-31T12:00:00Z")).toBe("2026-11-01T00:00:00.000Z");
    });

    it("treats 7 as Sunday", () => {
      expect(next("0 8 * * 7", "2026-10-28T00:00:00Z")).toBe("2026-11-01T08:00:00.000Z");
    });

    it("expands macros", () => {
      expect(next("@monthly", "2026-10-28T00:00:00Z")).toBe("2026-11-01T00:00:00.000Z");
      expect(next("@hourly", "2026-10-28T10:10:00Z")).toBe("2026-10-28T11:00:00.000Z");
    });

    it("uses the time zone of the cron job", () => {
      expect(next("0 2 * * *", "2026-10-28T11:00:00Z", "Asia/Kolkata")).toBe("2026-10-28T20:30:00.000Z");
    });

    it("uses a time zone given in the schedule", () => {
      expect(next("CRON_TZ=Asia/Kolkata 0 2 * * *", "2026-10-28T11:00:00Z")).toBe("2026-10-28T20:30:00.000Z");
    });

    it("waits for a leap day", () => {
      expect(next("0 0 29 2 *", "2026-10-28T00:00:00Z")).toBe("2028-02-29T00:00:00.000Z");
    });

    it("never runs on a day that does not exist", () => {
      expect(next("0 0 31 2 *", "2026-10-28T00:00:00Z")).toBeUndefined();
    });

    it("gives up on schedules it does not understand", () => {
      expect(parseCronSchedule("not a schedule")).toBeUndefined();
      expect(parseCronSchedule("61 * * * *")).toBeUndefined();
      expect(next("0 0 * * *", "2026-10-28T00:00:00Z", "Not/AZone")).toBeUndefined();
    });
  });

  describe("formatTimeUntil", () => {
    it("is exact below an hour", () => {
      expect(formatTimeUntil((18 * 60 + 40) * 1000)).toBe("In 18 minutes 40 seconds");
      expect(formatTimeUntil(61 * 1000)).toBe("In 1 minute 1 second");
    });

    it("is approximate from an hour", () => {
      expect(formatTimeUntil((8 * 60 + 48) * 60 * 1000 + 5000)).toBe("In about 8 hours 48 minutes");
      expect(formatTimeUntil((4 * 24 + 20) * 60 * 60 * 1000)).toBe("In about 4 days 20 hours");
    });
  });

  describe("formatExecutionTime", () => {
    it("names the day and the time zone", () => {
      const now = at("2026-10-28T11:30:00Z");

      expect(formatExecutionTime(at("2026-10-28T11:47:00Z"), "Etc/UTC", "CronJob time zone", now))
        .toBe("Today at 11:47 AM (CronJob time zone - Etc/UTC, UTC+00:00)");
      expect(formatExecutionTime(at("2026-10-28T20:30:00Z"), "Asia/Kolkata", "Local time zone", now))
        .toBe("Tomorrow at 2:00 AM (Local time zone - Asia/Kolkata, UTC+05:30)");
    });
  });
});
