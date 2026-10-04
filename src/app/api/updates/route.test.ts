import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache } from "@/lib/steam/cache";
import { EVENTS_HOST, mockSteam, NEWS_HOST, newsFixture } from "../../../../test/steam-fetch-mock";
import { GET } from "./route";

const get = (query = "") => GET(new NextRequest(`http://localhost/api/updates${query}`));

beforeEach(() => clearCache());
afterEach(() => vi.useRealTimers());

describe("GET /api/updates", () => {
  it("returns the first 6 updates and the total by default", async () => {
    mockSteam();
    const res = await get();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=60, stale-while-revalidate=60");
    expect(body.total).toBe(36);
    expect(body.updates).toHaveLength(6);
    expect(body.updates[0].id).toBe("1845383656390048");
  });

  it("pages with offset and limit", async () => {
    mockSteam();
    const all = (await (await get("?limit=24")).json()).updates;
    const page = (await (await get("?offset=6&limit=6")).json()).updates;
    expect(page.map((u: { id: string }) => u.id)).toEqual(all.slice(6, 12).map((u: { id: string }) => u.id));

    const last = await (await get("?offset=30&limit=24")).json();
    expect(last.updates).toHaveLength(6);
    expect((await (await get("?offset=100")).json()).updates).toEqual([]);
  });

  it.each([
    ["?limit=1000", 24],
    ["?limit=0", 1],
    ["?limit=abc&offset=-5", 6],
  ])("clamps %s to %i updates", async (query, expected) => {
    mockSteam();
    expect((await (await get(query)).json()).updates).toHaveLength(expected);
  });

  it("calls Steam once per endpoint while the cache is fresh, and again after 60s", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { callsTo } = mockSteam();

    await Promise.all([get(), get(), get("?offset=6")]);
    expect(callsTo(NEWS_HOST)).toBe(1);
    expect(callsTo(EVENTS_HOST)).toBe(1);

    vi.advanceTimersByTime(60_000);
    await get();
    expect(callsTo(NEWS_HOST)).toBe(2);
    expect(callsTo(EVENTS_HOST)).toBe(2);
  });

  it("returns 502 when Steam is down and nothing is cached", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { callsTo } = mockSteam({ [NEWS_HOST]: () => new Response("down", { status: 503 }) });

    const pending = get();
    await vi.runAllTimersAsync();
    const res = await pending;

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Could not load updates from Steam" });
    expect(callsTo(NEWS_HOST)).toBe(4); // first try + 3 retries
  });

  it("serves the last good data when Steam goes down after a successful load", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout"] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSteam();
    await get();

    vi.advanceTimersByTime(60_000);
    mockSteam({ [NEWS_HOST]: () => new Response("down", { status: 503 }) });
    const pending = get();
    await vi.runAllTimersAsync();
    const res = await pending;

    expect(res.status).toBe(200);
    expect((await res.json()).total).toBe(36);
  });

  it("recovers when a request fails and then succeeds on retry", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    let attempts = 0;
    const { callsTo } = mockSteam({
      [NEWS_HOST]: () => (++attempts < 3 ? new Response("flaky", { status: 500 }) : Response.json(newsFixture)),
    });

    const pending = get();
    await vi.runAllTimersAsync();
    expect((await pending).status).toBe(200);
    expect(callsTo(NEWS_HOST)).toBe(3);
  });
});
