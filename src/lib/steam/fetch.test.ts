import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { steamFetchText } from "./fetch";

const TARGET = "https://steamcommunity.com/stats/2804240/leaderboards/";

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "debug").mockImplementation(() => {});
});
afterEach(() => vi.useRealTimers());

function stubResponses(...statuses: number[]) {
  const fetch = vi.fn(async () => {
    const status = statuses.shift() ?? 200;
    return new Response(status === 200 ? "ok" : "error", { status });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("steamFetchText", () => {
  it("retries server errors with backoff", async () => {
    const fetch = stubResponses(503, 502);
    const result = steamFetchText(TARGET);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe("ok");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("retries rate limits", async () => {
    const fetch = stubResponses(429);
    const result = steamFetchText(TARGET);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe("ok");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails fast on client errors", async () => {
    const fetch = stubResponses(403);
    await expect(steamFetchText(TARGET)).rejects.toThrow("Steam request failed");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("gives up after the last retry", async () => {
    const fetch = stubResponses(500, 500, 500, 500);
    const result = steamFetchText(TARGET);
    const assertion = expect(result).rejects.toThrow("Steam request failed");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
