import { readFileSync } from "node:fs";
import { vi } from "vitest";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/steam/${name}`, import.meta.url), "utf8"));

export const newsFixture = fixture("news.json");
export const eventsFixture = fixture("events.json");

type Handler = (url: URL) => Response | Promise<Response>;

export const NEWS_HOST = "api.steampowered.com";
export const EVENTS_HOST = "store.steampowered.com";

/**
 * Replace global fetch with one that serves the recorded Steam fixtures.
 * Pass handlers to override a host, e.g. to make it fail.
 */
export function mockSteam(overrides: Partial<Record<string, Handler>> = {}) {
  const handlers: Record<string, Handler> = {
    [NEWS_HOST]: () => Response.json(newsFixture),
    [EVENTS_HOST]: () => Response.json(eventsFixture),
    ...overrides,
  };
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const handler = handlers[url.host];
    if (!handler) throw new Error(`Unexpected request in test: ${url}`);
    return handler(url);
  });
  vi.stubGlobal("fetch", fetchMock);

  const callsTo = (host: string) => fetchMock.mock.calls.filter(([input]) => new URL(String(input instanceof Request ? input.url : input)).host === host).length;
  return { fetchMock, callsTo };
}
