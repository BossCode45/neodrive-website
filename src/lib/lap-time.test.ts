import { describe, expect, it } from "vitest";
import { formatGap, formatTime } from "./lap-time";

describe("formatTime", () => {
  it.each([
    [9233, "00:09.233"],
    [0, "00:00.000"],
    [60_000, "01:00.000"],
    [83_007, "01:23.007"],
    [754_050, "12:34.050"],
  ])("%i ms → %s", (ms, expected) => {
    expect(formatTime(ms)).toBe(expected);
  });
});

describe("formatGap", () => {
  it.each([
    [282, "+0.282"],
    [0, "+0.000"],
    [4224, "+4.224"],
    [61_500, "+61.500"],
  ])("%i ms → %s", (ms, expected) => {
    expect(formatGap(ms)).toBe(expected);
  });
});
