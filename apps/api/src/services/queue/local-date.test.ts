import { describe, expect, test } from "bun:test";
import {
  addDays,
  getShopLocalDate,
  getShopLocalTime,
  isPastClosingTime,
} from "./local-date";

// 2026-09-27 13:20 UTC is 19:05 in Kathmandu (UTC+5:45).
const AT_1905_KATHMANDU = new Date("2026-09-27T13:20:00Z");

describe("getShopLocalDate / addDays", () => {
  test("uses the shop's own calendar day, not UTC's", () => {
    // 20:00 UTC on the 27th is already 01:45 on the 28th in Kathmandu.
    expect(
      getShopLocalDate("Asia/Kathmandu", new Date("2026-09-27T20:00:00Z")),
    ).toBe("2026-09-28");
  });

  test("addDays moves across month ends", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
  });
});

describe("getShopLocalTime", () => {
  test("is the shop's wall-clock time in 24-hour HH:MM", () => {
    expect(getShopLocalTime("Asia/Kathmandu", AT_1905_KATHMANDU)).toBe("19:05");
    expect(getShopLocalTime("UTC", AT_1905_KATHMANDU)).toBe("13:20");
  });
});

describe("isPastClosingTime", () => {
  test("false with no closing time (open until midnight)", () => {
    expect(isPastClosingTime(null, "Asia/Kathmandu", AT_1905_KATHMANDU)).toBe(
      false,
    );
  });

  test("true at and after the closing minute", () => {
    expect(
      isPastClosingTime("19:00", "Asia/Kathmandu", AT_1905_KATHMANDU),
    ).toBe(true);
    expect(
      isPastClosingTime("19:05", "Asia/Kathmandu", AT_1905_KATHMANDU),
    ).toBe(true);
  });

  test("false before the closing time", () => {
    expect(
      isPastClosingTime("19:06", "Asia/Kathmandu", AT_1905_KATHMANDU),
    ).toBe(false);
    expect(
      isPastClosingTime("21:00", "Asia/Kathmandu", AT_1905_KATHMANDU),
    ).toBe(false);
  });

  test("accepts Postgres's HH:MM:SS form too", () => {
    expect(
      isPastClosingTime("19:00:00", "Asia/Kathmandu", AT_1905_KATHMANDU),
    ).toBe(true);
  });

  test("judges by the shop's timezone, not the server's", () => {
    // 13:20 UTC: past 13:00 in UTC, but in Kathmandu it's already 19:05.
    expect(isPastClosingTime("20:00", "UTC", AT_1905_KATHMANDU)).toBe(false);
    expect(isPastClosingTime("13:00", "UTC", AT_1905_KATHMANDU)).toBe(true);
  });
});
