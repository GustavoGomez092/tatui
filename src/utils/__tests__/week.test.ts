import { describe, it, expect } from "vitest";
import { setDayOfWeekPreservingTime, getDayOfWeek } from "../week.js";

describe("setDayOfWeekPreservingTime", () => {
  it("moves a Thursday timestamp to Monday of the same week, preserving time", () => {
    // 2026-04-23 is a Thursday. Monday of that week is 2026-04-20.
    const reference = new Date(2026, 3, 23, 15, 30, 45, 123).toISOString();
    const result = setDayOfWeekPreservingTime(reference, 0);
    const d = new Date(result);

    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3); // April (0-indexed)
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(15);
    expect(d.getMinutes()).toBe(30);
    expect(d.getSeconds()).toBe(45);
    expect(d.getMilliseconds()).toBe(123);
    expect(getDayOfWeek(result)).toBe(0); // Monday
  });

  it("moves a Monday to Sunday of the same week", () => {
    // 2026-04-20 is a Monday. Sunday of that week is 2026-04-26.
    const reference = new Date(2026, 3, 20, 9, 0, 0, 0).toISOString();
    const result = setDayOfWeekPreservingTime(reference, 6);
    const d = new Date(result);

    expect(d.getDate()).toBe(26);
    expect(d.getHours()).toBe(9);
    expect(getDayOfWeek(result)).toBe(6); // Sunday
  });

  it("is a no-op when the target day equals the current day-of-week", () => {
    const reference = new Date(2026, 3, 23, 12, 0, 0, 0).toISOString();
    const result = setDayOfWeekPreservingTime(reference, 3); // Thursday
    expect(new Date(result).getDate()).toBe(23);
  });
});
