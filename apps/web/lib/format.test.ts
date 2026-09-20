import { describe, expect, test } from "bun:test";
import {
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
