import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { boardFixture, COMMUNITY_HOST, communityFixtures, mockSteam, NEWS_HOST, PROFILE_ID } from "../../../test/steam-fetch-mock";
import { clearCache } from "./cache";
import { getLeaderboard } from "./leaderboards";

const PROFILES = /steamcommunity\.com\/profiles\//;
const BOARD_PAGES = /steamcommunity\.com\/stats\/\d+\/leaderboards\/\d+\//;

beforeEach(() => clearCache());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("getLeaderboard", () => {
  it("returns every entry, fastest first, with times and gaps in ms", async () => {
    mockSteam();
    const board = await getLeaderboard("1-07");

    expect(board?.track.name).toBe("Autocross I");
    expect(board?.total).toBe(19);
    expect(board?.entries.map((e) => e.rank)).toEqual(Array.from({ length: 19 }, (_, i) => i + 1));
    expect(board?.entries[0]).toEqual({
      rank: 1,
      steamId: PROFILE_ID,
      name: "verily",
      avatar: "https://avatars.akamai.steamstatic.com/abfe4b8e794797edc69c92ffdafce77486e68dee_medium.jpg",
      timeMs: 9233,
      gapMs: 0,
    });
    expect(board?.entries[1]).toMatchObject({ timeMs: 9515, gapMs: 282 });
  });

  it("falls back to the Steam ID when a profile can't be found", async () => {
    mockSteam();
    const board = await getLeaderboard("1-07");
    expect(board?.entries[1]).toMatchObject({ steamId: "76561197993316771", name: "76561197993316771", avatar: null });
  });

  it("returns null for an unknown track without calling Steam", async () => {
    const { fetchMock } = mockSteam();
    expect(await getLeaderboard("9-99")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves a cached board, and reuses cached players when the board refreshes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { callsMatching } = mockSteam();
    await getLeaderboard("1-07");
    await getLeaderboard("1-07");
    expect(callsMatching(BOARD_PAGES)).toBe(1);
    expect(callsMatching(PROFILES)).toBe(19);

    vi.advanceTimersByTime(60_000);
    await getLeaderboard("1-07");
    expect(callsMatching(BOARD_PAGES)).toBe(2);
    expect(callsMatching(PROFILES)).toBe(19); // found and not-found players are both still cached
  });

  it("keeps paging while Steam returns nextRequestURL", async () => {
    const entries = boardFixture.match(/<entry>[\s\S]*?<\/entry>/g)!;
    const page = (rows: string[], more: boolean) =>
      new Response(`<response><entries>${rows.join("")}</entries>${more ? "<nextRequestURL><![CDATA[x]]></nextRequestURL>" : ""}</response>`);
    const { callsMatching } = mockSteam({
      [COMMUNITY_HOST]: (url) => {
        if (url.pathname.endsWith("/leaderboards/")) return new Response(`<leaderboard><lbid>1</lbid><name>Campaign Autocross I</name><displaytype>3</displaytype></leaderboard>`);
        if (url.pathname.startsWith("/profiles/")) return new Response("<response><error>nope</error></response>");
        return url.searchParams.get("start") === "1" ? page(entries.slice(0, 10), true) : page(entries.slice(10), false);
      },
    });

    const board = await getLeaderboard("1-07");
    expect(board?.total).toBe(19);
    expect(callsMatching(BOARD_PAGES)).toBe(2);
  });

  it("uses GetPlayerSummaries when STEAM_API_KEY is set", async () => {
    vi.stubEnv("STEAM_API_KEY", "test-key");
    const requested: string[] = [];
    const { callsMatching } = mockSteam({
      [NEWS_HOST]: (url) => {
        expect(url.pathname).toBe("/ISteamUser/GetPlayerSummaries/v2/");
        expect(url.searchParams.get("key")).toBe("test-key");
        requested.push(...url.searchParams.get("steamids")!.split(","));
        return Response.json({
          response: { players: [{ steamid: PROFILE_ID, personaname: "verily", avatarmedium: "https://avatars.steamstatic.com/a_medium.jpg" }] },
        });
      },
    });

    const board = await getLeaderboard("1-07");
    expect(requested).toHaveLength(19);
    expect(callsMatching(PROFILES)).toBe(0);
    expect(board?.entries[0]).toMatchObject({ name: "verily", avatar: "https://avatars.steamstatic.com/a_medium.jpg" });
    expect(board?.entries[1].name).toBe("76561197993316771");
  });

  it("still loads with Steam IDs when player lookups fail", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] }); // skip steamFetch's retry backoff
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSteam({
      [COMMUNITY_HOST]: (url) =>
        url.pathname.startsWith("/profiles/")
          ? new Response("down", { status: 503 })
          : communityFixtures(url),
    });

    const pending = getLeaderboard("1-07");
    await vi.runAllTimersAsync();
    const board = await pending;
    expect(board?.total).toBe(19);
    expect(board?.entries.every((e) => e.name === e.steamId && e.avatar === null)).toBe(true);
  });

  it("throws when Steam is down and nothing is cached", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    mockSteam({ [COMMUNITY_HOST]: () => new Response("down", { status: 503 }) });

    const pending = getLeaderboard("1-07");
    const assertion = expect(pending).rejects.toThrow(/Steam request failed/);
    await vi.runAllTimersAsync();
    await assertion;
  });
});
