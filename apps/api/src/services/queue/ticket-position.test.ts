import { describe, expect, test } from "bun:test";
import { deriveEtaMinutes, positionFor } from "./ticket-position";

describe("positionFor", () => {
  test("being served is position 0", () => {
    expect(positionFor("serving", 0)).toBe(0);
  });

  test("waiting with nobody ahead is 1 (next)", () => {
    expect(positionFor("waiting", 0)).toBe(1);
  });

  test("waiting with 3 people ahead is 4", () => {
    expect(positionFor("waiting", 3)).toBe(4);
  });

  test("not in line means no position", () => {
    for (const status of [
      "pending_verification",
      "done",
      "no_show",
      "cancelled",
      "expired",
    ] as const) {
      expect(positionFor(status, 2)).toBeNull();
    }
  });
});

describe("deriveEtaMinutes", () => {
  test("is position times the average service time", () => {
    expect(deriveEtaMinutes(3, 10)).toBe(30);
  });

  test("is 0 when it's your turn", () => {
    expect(deriveEtaMinutes(0, 10)).toBe(0);
  });
});
