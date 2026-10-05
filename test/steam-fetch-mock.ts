import { readFileSync } from "node:fs";
import { vi } from "vitest";

const text = (name: string) => readFileSync(new URL(`./fixtures/steam/${name}`, import.meta.url), "utf8");
const fixture = (name: string) => JSON.parse(text(name));

export const newsFixture = fixture("news.json");
export const eventsFixture = fixture("events.json");
export const boardsFixture = text("leaderboards.xml");
/** Autocross I: 19 entries, led by verily on 9233 ms. Served for every board. */
export const boardFixture = text("leaderboard-autocross.xml");
/** The public profile of verily, the Autocross I record holder. Other profiles are "not found". */
export const profileFixture = text("profile.xml");
export const PROFILE_ID = "76561198684259471";
const PROFILE_NOT_FOUND = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><response><error><![CDATA[The specified profile could not be found.]]></error></response>`;

type Handler = (url: URL) => Response | Promise<Response>;

export const NEWS_HOST = "api.steampowered.com";
export const EVENTS_HOST = "store.steampowered.com";
export const COMMUNITY_HOST = "steamcommunity.com";

const xml = (body: string) => new Response(body, { headers: { "Content-Type": "text/xml" } });

/** The default steamcommunity.com handler, for overrides that only change part of it. */
export function communityFixtures(url: URL) {
  if (/^\/stats\/\d+\/leaderboards\/$/.test(url.pathname)) return xml(boardsFixture);
  if (/^\/stats\/\d+\/leaderboards\/\d+\/$/.test(url.pathname)) return xml(boardFixture);
  if (url.pathname === `/profiles/${PROFILE_ID}/`) return xml(profileFixture);
  if (url.pathname.startsWith("/profiles/")) return xml(PROFILE_NOT_FOUND);
  return new Response("Not found", { status: 404 });
}

/**
 * Replace global fetch with one that serves the recorded Steam fixtures.
 * Pass handlers to override a host, e.g. to make it fail.
 */
export function mockSteam(overrides: Partial<Record<string, Handler>> = {}) {
  const handlers: Record<string, Handler> = {
    [NEWS_HOST]: () => Response.json(newsFixture),
    [EVENTS_HOST]: () => Response.json(eventsFixture),
    [COMMUNITY_HOST]: communityFixtures,
    ...overrides,
  };
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const handler = handlers[url.host];
    if (!handler) throw new Error(`Unexpected request in test: ${url}`);
    return handler(url);
  });
  vi.stubGlobal("fetch", fetchMock);

  const urls = () => fetchMock.mock.calls.map(([input]) => new URL(String(input instanceof Request ? input.url : input)));
  const callsTo = (host: string) => urls().filter((url) => url.host === host).length;
  /** Requests whose host + path matches, e.g. /steamcommunity\.com\/profiles\//. */
  const callsMatching = (pattern: RegExp) => urls().filter((url) => pattern.test(url.host + url.pathname)).length;
  return { fetchMock, callsTo, callsMatching };
}
