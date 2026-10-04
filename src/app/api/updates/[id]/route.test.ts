import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { clearCache } from "@/lib/steam/cache";
import { mockSteam, NEWS_HOST } from "../../../../../test/steam-fetch-mock";
import { GET as getList } from "../route";
import { GET } from "./route";

const get = (id: string) =>
  GET(new NextRequest(`http://localhost/api/updates/${id}`), { params: Promise.resolve({ id }) });

beforeEach(() => clearCache());

describe("GET /api/updates/[id]", () => {
  it("returns the full update", async () => {
    mockSteam();
    const res = await get("1845383656390048");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
    expect(body).toMatchObject({
      id: "1845383656390048",
      label: "v0.11.487",
      fullTitle: "0.11.487 - New Track & Cosmetic Menu Improvements",
      steamUrl: "https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1845383656390048",
    });
    expect(body.html).toMatch(/^<p>This update brings a completely new customization menu/);
    expect(body.html).toContain('src="/_next/image?url=');
  });

  it("returns 404 for an unknown id", async () => {
    mockSteam();
    const res = await get("123");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Update not found" });
  });

  it("makes no Steam calls once the list has been loaded", async () => {
    const { callsTo } = mockSteam();
    await getList(new NextRequest("http://localhost/api/updates"));

    await get("1845383656390048");
    await get("1844751498230064");
    await get("does-not-exist");
    expect(callsTo(NEWS_HOST)).toBe(1);
  });
});
