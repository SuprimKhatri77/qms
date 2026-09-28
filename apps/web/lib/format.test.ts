import { describe, expect, test } from "bun:test";
import {
  formatDistance,
  formatCountdown,
  formatDateTime,
  formatHour,
  formatLongDate,
  formatMinutes,
  formatPercent,
  formatShortDate,
  formatTime,
} from "./format";

describe("formatMinutes", () => {
  test("shows a dash for null", () => {
    expect(formatMinutes(null)).toBe("—");
  });

  test("appends 'min' to a number", () => {
    expect(formatMinutes(12)).toBe("12 min");
  });
});

describe("formatPercent", () => {
  test("shows a dash for null", () => {
    expect(formatPercent(null)).toBe("—");
  });

  test("rounds a fraction to the nearest whole percent", () => {
    expect(formatPercent(0.1666)).toBe("17%");
  });

  test("handles 0 and 1", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1)).toBe("100%");
  });
});

describe("formatShortDate", () => {
  test("formats a YYYY-MM-DD date without a year", () => {
    expect(formatShortDate("2026-09-18")).toBe("Sep 18");
  });
});

describe("formatLongDate", () => {
  test("formats a YYYY-MM-DD date with weekday and year", () => {
    expect(formatLongDate("2026-09-18")).toBe("Friday, September 18, 2026");
  });
});

describe("formatHour", () => {
  test("formats midnight as 12 am", () => {
    expect(formatHour(0)).toBe("12 am");
  });

  test("formats noon as 12 pm", () => {
    expect(formatHour(12)).toBe("12 pm");
  });

  test("formats a morning hour", () => {
    expect(formatHour(9)).toBe("9 am");
  });

  test("formats an afternoon hour", () => {
    expect(formatHour(13)).toBe("1 pm");
  });
});

describe("formatDateTime", () => {
  test("formats a full ISO timestamp", () => {
    const result = formatDateTime("2026-09-18T10:15:00.000Z");
    expect(result).toContain("Sep 18, 2026");
  });
});

describe("formatTime", () => {
  test("shows a dash for null", () => {
    expect(formatTime(null, "Asia/Kathmandu")).toBe("—");
  });

  test("renders the clock time in the given timezone", () => {
    // 06:00 UTC is 11:45 in Asia/Kathmandu (UTC+5:45).
    const result = formatTime("2026-09-18T06:00:00.000Z", "Asia/Kathmandu");
    expect(result).toBe("11:45 AM");
  });
});

describe("formatCountdown", () => {
  test("shows plain seconds under a minute", () => {
    expect(formatCountdown(59)).toBe("59s");
    expect(formatCountdown(1)).toBe("1s");
  });

  test("shows minutes and zero-padded seconds from a minute up", () => {
    expect(formatCountdown(60)).toBe("1:00");
    expect(formatCountdown(65)).toBe("1:05");
    expect(formatCountdown(899)).toBe("14:59");
  });
});

describe("formatDistance", () => {
  test("shows metres under a kilometre, rounded to 10 m", () => {
    expect(formatDistance(0.853)).toBe("850 m away");
    expect(formatDistance(0.004)).toBe("0 m away");
  });

  test("shows kilometres with one decimal from 1 km up", () => {
    expect(formatDistance(1)).toBe("1.0 km away");
    expect(formatDistance(12.345)).toBe("12.3 km away");
  });

  test("995 m rounds up to kilometres, not '1000 m'", () => {
    expect(formatDistance(0.996)).toBe("1.0 km away");
  });
});
