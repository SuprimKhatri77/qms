import { describe, expect, test } from "bun:test";
import {
  addDays,
  getShopLocalDate,
  getOpeningHoursStatus,
  getShopLocalTime,
  isBeforeOpeningTime,
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

describe("isBeforeOpeningTime", () => {
  test("no opening time means open from midnight", () => {
    expect(isBeforeOpeningTime(null, "Asia/Kathmandu", AT_1905_KATHMANDU)).toBe(
      false,
    );
  });

  test("is true until the opening minute, and false from it", () => {
    expect(
      isBeforeOpeningTime("19:06", "Asia/Kathmandu", AT_1905_KATHMANDU),
    ).toBe(true);
    expect(
      isBeforeOpeningTime("19:05", "Asia/Kathmandu", AT_1905_KATHMANDU),
    ).toBe(false);
    expect(
      isBeforeOpeningTime("09:00", "Asia/Kathmandu", AT_1905_KATHMANDU),
    ).toBe(false);
  });

  test("accepts Postgres's HH:MM:SS form", () => {
    expect(
      isBeforeOpeningTime("20:00:00", "Asia/Kathmandu", AT_1905_KATHMANDU),
    ).toBe(true);
  });

  test("judges by the shop's timezone, not the server's", () => {
    // 13:20 UTC is 19:05 in Kathmandu.
    expect(isBeforeOpeningTime("14:00", "UTC", AT_1905_KATHMANDU)).toBe(true);
    expect(
      isBeforeOpeningTime("14:00", "Asia/Kathmandu", AT_1905_KATHMANDU),
    ).toBe(false);
  });
});

describe("getOpeningHoursStatus", () => {
  const kathmandu = (openingTime: string | null, closingTime: string | null) =>
    getOpeningHoursStatus(
      { openingTime, closingTime, timezone: "Asia/Kathmandu" },
      AT_1905_KATHMANDU,
    );

  test("with no hours set it's always open", () => {
    expect(kathmandu(null, null)).toBe("open");
  });

  test("inside the hours it's open", () => {
    expect(kathmandu("09:00", "21:00")).toBe("open");
    expect(kathmandu("19:05", "19:06")).toBe("open");
  });

  test("before the opening time it's before_opening", () => {
    expect(kathmandu("20:00", "22:00")).toBe("before_opening");
    expect(kathmandu("20:00", null)).toBe("before_opening");
  });

  test("from the closing time it's after_closing", () => {
    expect(kathmandu("09:00", "19:05")).toBe("after_closing");
    expect(kathmandu(null, "17:00")).toBe("after_closing");
  });
});
