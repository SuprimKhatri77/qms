import { describe, expect, test } from "bun:test";
import { normalizeSubject, parseRetryBlock, secondsUntil } from "./retry-block";

describe("secondsUntil", () => {
  test("rounds a part-second up, so it never shows 0 too early", () => {
    expect(secondsUntil(10_500, 10_000)).toBe(1);
    expect(secondsUntil(70_000, 10_000)).toBe(60);
  });

  test("never goes below 0 once the end has passed", () => {
    expect(secondsUntil(10_000, 10_000)).toBe(0);
    expect(secondsUntil(10_000, 99_000)).toBe(0);
  });

  test("a big gap between ticks (a throttled background tab) is still exact", () => {
    const endsAt = 900_000;
    // One tick at 0s, the next not until 5 minutes later.
    expect(secondsUntil(endsAt, 0)).toBe(900);
    expect(secondsUntil(endsAt, 300_000)).toBe(600);
  });
});

describe("normalizeSubject", () => {
  test("matches the API's email normalising", () => {
    expect(normalizeSubject("  Owner@Example.COM ")).toBe("owner@example.com");
  });
});

describe("parseRetryBlock", () => {
  test("reads back a saved block", () => {
    expect(parseRetryBlock('{"endsAt":123,"subject":"a@x.com"}')).toEqual({
      endsAt: 123,
      subject: "a@x.com",
    });
  });

  test.each([
    null,
    "",
    "not json",
    "null",
    "42",
    '{"endsAt":"soon","subject":"a@x.com"}',
    '{"endsAt":123}',
  ])("treats %p as no block", (saved) => {
    expect(parseRetryBlock(saved)).toBeNull();
  });
});
