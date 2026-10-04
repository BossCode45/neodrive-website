import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cached, clearCache, peek, prime } from "./cache";

const TTL = 60_000;

beforeEach(() => {
  clearCache();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cached", () => {
  it("serves the cached value within the TTL and reloads after it", async () => {
    const loader = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");

    expect(await cached("key", TTL, loader)).toBe("first");
    vi.advanceTimersByTime(TTL - 1);
    expect(await cached("key", TTL, loader)).toBe("first");
    expect(loader).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(await cached("key", TTL, loader)).toBe("second");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    let resolve!: (value: string) => void;
    const loader = vi.fn(() => new Promise<string>((r) => (resolve = r)));

    const a = cached("key", TTL, loader);
    const b = cached("key", TTL, loader);
    resolve("value");

    expect(await Promise.all([a, b])).toEqual(["value", "value"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("serves stale data when a refresh fails, and keeps it for another TTL", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await cached("key", TTL, async () => "stale");
    vi.advanceTimersByTime(TTL);

    const failing = vi.fn().mockRejectedValue(new Error("Steam is down"));
    expect(await cached("key", TTL, failing)).toBe("stale");
    expect(await cached("key", TTL, failing)).toBe("stale");
    expect(failing).toHaveBeenCalledTimes(1); // not retried on every request

    vi.advanceTimersByTime(TTL);
    expect(await cached("key", TTL, async () => "fresh")).toBe("fresh");
  });

  it("throws and caches nothing when the first load fails", async () => {
    await expect(cached("key", TTL, () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(peek("key")).toBeUndefined();
    expect(await cached("key", TTL, async () => "ok")).toBe("ok");
  });
});

describe("prime / peek", () => {
  it("stores a value that expires after the TTL", () => {
    prime("key", TTL, 42);
    expect(peek("key")).toBe(42);
    vi.advanceTimersByTime(TTL);
    expect(peek("key")).toBeUndefined();
  });
});
