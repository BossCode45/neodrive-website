import { beforeEach, describe, expect, it, vi } from "vitest";
import { EVENTS_HOST, mockSteam, NEWS_HOST } from "../../../test/steam-fetch-mock";
import { clearCache } from "./cache";
import { getUpdate, getUpdates, parseTitle } from "./updates";

beforeEach(() => clearCache());

describe("parseTitle", () => {
  it.each([
    ["0.11.487 - New Track & Cosmetic Menu Improvements", undefined, "v0.11.487", "New Track & Cosmetic Menu Improvements"],
    ["0.11.387- Small Bugfixes", undefined, "v0.11.387", "Small Bugfixes"],
    ["0.10.105b - Tiny Patch", undefined, "v0.10.105b", "Tiny Patch"],
    ["0.11.370", undefined, "v0.11.370", "Patch notes"],
    [" 0.10.168", undefined, "v0.10.168", "Patch notes"],
    ["Devlog | Lancier Reveal", 28, "Devlog", "Lancier Reveal"],
    ["Lancier TCS", 12, "Patch", "Lancier TCS"],
    ["Halfway through Early Access", 28, "News", "Halfway through Early Access"],
    ["Something new", undefined, "News", "Something new"],
  ])("%j → %s / %s", (fullTitle, eventType, label, title) => {
    expect(parseTitle(fullTitle, eventType)).toEqual({ label, title });
  });
});

describe("getUpdates", () => {
  it("returns every post, newest first, with images from the events endpoint", async () => {
    mockSteam();
    const updates = await getUpdates();

    expect(updates).toHaveLength(36);
    expect(updates.map((u) => u.date)).toEqual([...updates.map((u) => u.date)].sort().reverse());
    expect(updates[0]).toMatchObject({
      id: "1845383656390048",
      label: "v0.11.487",
      title: "New Track & Cosmetic Menu Improvements",
      date: "2026-10-03T21:55:22.000Z",
      image: {
        url: "https://clan.akamai.steamstatic.com/images/45829248/9eb9f5d5a0e29a7e7c48b015c07b9212bc5fe9d5.png",
        isFallback: false,
      },
    });
    expect(updates[0]).not.toHaveProperty("html"); // summaries stay small
  });

  it("uses the fallback image when a post has no Steam image", async () => {
    mockSteam();
    const update = (await getUpdates()).find((u) => u.id === "1844751498230064"); // 0.11.456, text only
    expect(update?.image).toEqual({ url: "/logo-orange.png", isFallback: true });
  });

  it("still loads, with fallback images, when the events endpoint fails", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] }); // skip steamFetch's retry backoff
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { callsTo } = mockSteam({ [EVENTS_HOST]: () => new Response("nope", { status: 500 }) });

    const updates = getUpdates();
    await vi.runAllTimersAsync();
    const result = await updates;
    vi.useRealTimers();

    expect(result).toHaveLength(36);
    expect(result[0].image.url).not.toMatch(/9eb9f5d5a0e29a7e7c48b015c07b9212bc5fe9d5/); // no capsule without events
    expect(callsTo(EVENTS_HOST)).toBe(4); // first try + 3 retries
  });

  it("treats list-shaped jsondata as 'no images'", async () => {
    mockSteam({
      [EVENTS_HOST]: () =>
        Response.json({
          events: [{ event_name: "0.11.487 - New Track & Cosmetic Menu Improvements", event_type: 13, jsondata: "[]", announcement_body: { clanid: "1", posttime: 1791064522 } }],
        }),
    });
    const [first] = await getUpdates();
    expect(first.image.url).toMatch(/clan\.akamai\.steamstatic\.com/); // falls back to the first inline image
  });
});

describe("getUpdate", () => {
  it("returns the full post without another Steam call once the list is loaded", async () => {
    const { callsTo } = mockSteam();
    await getUpdates();
    const update = await getUpdate("1845383656390048");

    expect(update?.html).toContain("<img");
    expect(update?.banner).toMatch(/fce52bb65866557521940f70970943a276410ad0\.png$/);
    expect(callsTo(NEWS_HOST)).toBe(1);
  });

  it("returns null for an unknown id without an extra Steam call", async () => {
    const { callsTo } = mockSteam();
    await getUpdates();
    expect(await getUpdate("123")).toBeNull();
    expect(callsTo(NEWS_HOST)).toBe(1);
  });
});
