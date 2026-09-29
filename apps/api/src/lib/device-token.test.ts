import { describe, expect, test } from "bun:test";
import {
  DEVICE_COOKIE_NAME,
  newDeviceToken,
  readDeviceToken,
} from "./device-token";

const VALID_TOKEN = "0123456789abcdef0123456789abcdef";

describe("newDeviceToken", () => {
  test("mints 32 lowercase hex characters", () => {
    expect(newDeviceToken()).toMatch(/^[0-9a-f]{32}$/);
  });

  test("mints a different token each time", () => {
    expect(newDeviceToken()).not.toBe(newDeviceToken());
  });

  test("mints a token that readDeviceToken accepts", () => {
    const token = newDeviceToken();
    expect(readDeviceToken(`${DEVICE_COOKIE_NAME}=${token}`)).toBe(token);
  });
});

describe("readDeviceToken", () => {
  test("returns null when there is no Cookie header", () => {
    expect(readDeviceToken(undefined)).toBeNull();
    expect(readDeviceToken("")).toBeNull();
  });

  test("reads the token when it's the only cookie", () => {
    expect(readDeviceToken(`palo_device=${VALID_TOKEN}`)).toBe(VALID_TOKEN);
  });

  test("reads the token from among other cookies", () => {
    const header = `theme=dark; palo_device=${VALID_TOKEN}; other=1`;
    expect(readDeviceToken(header)).toBe(VALID_TOKEN);
  });

  test("returns null when our cookie isn't there", () => {
    expect(readDeviceToken("theme=dark; other=1")).toBeNull();
  });

  test("doesn't match a cookie whose name only contains ours", () => {
    expect(readDeviceToken(`old_palo_device=${VALID_TOKEN}`)).toBeNull();
  });

  test("ignores a malformed pair with no '='", () => {
    expect(readDeviceToken(`garbage; palo_device=${VALID_TOKEN}`)).toBe(
      VALID_TOKEN,
    );
  });

  test.each([
    ["an empty value", "palo_device="],
    ["uppercase hex", `palo_device=${VALID_TOKEN.toUpperCase()}`],
    ["a value that's too short", "palo_device=abc123"],
    ["a value that's too long", `palo_device=${VALID_TOKEN}00`],
    ["non-hex characters", `palo_device=${"z".repeat(32)}`],
    ["a huge value", `palo_device=${"a".repeat(5000)}`],
  ])("rejects %s", (_label, header) => {
    expect(readDeviceToken(header)).toBeNull();
  });
});
