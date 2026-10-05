import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache } from "@/lib/steam/cache";
import { COMMUNITY_HOST, mockSteam, PROFILE_ID } from "../../../../../test/steam-fetch-mock";
import { GET } from "./route";

const get = (code: string, query = "") =>
  GET(new NextRequest(`http://localhost/api/leaderboards/${code}${query}`), { params: Promise.resolve({ code }) });

beforeEach(() => clearCache());
afterEach(() => vi.useRealTimers());

describe("GET /api/leaderboards/[code]", () => {
  it("returns the first 12 entries and the total by default", async () => {
    mockSteam();
    const res = await get("1-07");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=60, stale-while-revalidate=60");
    expect(body.total).toBe(19);
    expect(body.entries).toHaveLength(12);
    expect(body.entries[0]).toMatchObject({ rank: 1, steamId: PROFILE_ID, name: "verily", timeMs: 9233 });
  });

  it("pages with offset and limit", async () => {
    mockSteam();
    const body = await (await get("1-07", "?offset=12&limit=100")).json();
    expect(body.entries.map((e: { rank: number }) => e.rank)).toEqual([13, 14, 15, 16, 17, 18, 19]);
    expect((await (await get("1-07", "?offset=50")).json()).entries).toEqual([]);
  });

  it.each([
    ["?limit=1000", 19],
    ["?limit=0", 1],
    ["?limit=abc&offset=-5", 12],
  ])("clamps %s to %i entries", async (query, expected) => {
    mockSteam();
    expect((await (await get("1-07", query)).json()).entries).toHaveLength(expected);
  });

  it("returns 404 for an unknown track", async () => {
    mockSteam();
    const res = await get("9-99");
    expect(res.status).toBe(404);
  });

  it("returns 502 when Steam fails", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] }); // skip steamFetch's retry backoff
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSteam({ [COMMUNITY_HOST]: () => new Response("down", { status: 503 }) });

    const pending = get("1-07");
    await vi.runAllTimersAsync();
    const res = await pending;
    expect(res.status).toBe(502);
  });
});
