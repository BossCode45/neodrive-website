import "server-only";
import { bodyImages, CLAN_IMAGE_BASE, isSteamImage, toExcerpt, toHtml } from "./bbcode";
import { cached, peek, prime } from "./cache";
import { steamFetch } from "./fetch";

const APP_ID = 2804240;
const TTL_MS = 60_000;
const FALLBACK_IMAGE = "/logo-orange.png";

export type UpdateSummary = {
  id: string;
  /** Title without the version prefix, e.g. "New Track & Cosmetic Menu Improvements". */
  title: string;
  /** Text for the orange tag: "v0.11.487", or a post type such as "News" when there is no version. */
  label: string;
  /** ISO 8601, UTC. */
  date: string;
  excerpt: string;
  image: { url: string; isFallback: boolean };
  steamUrl: string;
};

export type Update = UpdateSummary & {
  /** The full title as posted on Steam. */
  fullTitle: string;
  author: string | null;
  /** Wide banner image, if the post has one. */
  banner: string | null;
  /** Post body as sanitized HTML. */
  html: string;
};

type NewsResponse = {
  appnews?: {
    newsitems?: {
      gid: string;
      title: string;
      url: string;
      author?: string;
      contents?: string;
      date: number;
    }[];
  };
};

type EventsResponse = {
  events?: {
    event_name: string;
    event_type: number;
    jsondata?: string;
    announcement_body?: { clanid?: string; posttime?: number };
  }[];
};

type EventInfo = { title: string; posttime?: number; type: number; banner: string | null; capsule: string | null };

const EVENT_TYPE_LABELS: Record<number, string> = {
  12: "Patch",
  13: "Update",
  14: "Major update",
  28: "News",
};

/** All updates, newest first. Cached for 60s; also refreshes every per-update entry. */
export function getUpdates(): Promise<UpdateSummary[]> {
  return loadAll().then((updates) => updates.map(toSummary));
}

/** One update with its full body, or null if Steam has no post with this id. Cached for 60s. */
export async function getUpdate(id: string): Promise<Update | null> {
  const hit = peek<Update>(`updates:${id}`);
  if (hit) return hit;
  // Steam has no endpoint for a single post, so a miss reloads the list (which re-primes every entry).
  // Unknown ids are not cached, so random ids can't grow the cache.
  const updates = await loadAll();
  return updates.find((u) => u.id === id) ?? null;
}

function loadAll(): Promise<Update[]> {
  return cached("updates:list", TTL_MS, async () => {
    const [news, events] = await Promise.all([fetchNews(), fetchEvents()]);
    const updates = news.map((item) => buildUpdate(item, matchEvent(item, events)));
    for (const update of updates) prime(`updates:${update.id}`, TTL_MS, update);
    return updates;
  });
}

async function fetchNews() {
  const data = await steamFetch<NewsResponse>("https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/", {
    appid: APP_ID,
    count: 100,
    maxlength: 0,
    format: "json",
    feeds: "steam_community_announcements",
  });
  return data.appnews?.newsitems ?? [];
}

/** Banner/capsule images and post types from the store's (undocumented) events endpoint. Never throws. */
async function fetchEvents(): Promise<EventInfo[]> {
  try {
    const data = await steamFetch<EventsResponse>("https://store.steampowered.com/events/ajaxgetpartnereventspageable/", {
      appid: APP_ID,
      offset: 0,
      count: 100,
      l: "english",
    });
    return (data.events ?? []).map((event) => {
      const clanId = event.announcement_body?.clanid;
      let json: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(event.jsondata || "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) json = parsed; // sometimes a list
      } catch {}

      // Localized arrays; index 0 is English, take the first non-empty entry.
      const first = (key: string) => {
        const values = Array.isArray(json[key]) ? (json[key] as unknown[]) : [];
        const name = values.find((v): v is string => typeof v === "string" && v.length > 0);
        return name && clanId ? `${CLAN_IMAGE_BASE}/${clanId}/${name}` : null;
      };

      return {
        title: event.event_name.trim(),
        posttime: event.announcement_body?.posttime,
        type: event.event_type,
        banner: first("localized_title_image"),
        capsule: first("localized_capsule_image"),
      };
    });
  } catch (error) {
    console.error("[updates] could not fetch event images", error);
    return [];
  }
}

function matchEvent(item: { title: string; date: number }, events: EventInfo[]) {
  return events.find((e) => e.posttime === item.date) ?? events.find((e) => e.title === item.title.trim());
}

const VERSION_TITLE = /^\s*v?(\d+\.\d+(?:\.\d+)?[a-z]?)\b\s*[-–—|:]?\s*(.*)$/i;
const PREFIXED_TITLE = /^([^|]{1,20}?)\s*\|\s*(.+)$/;

/**
 * Split a Steam post title into the card's tag label and title.
 * "0.11.487 - New Track" → v0.11.487 / New Track; "Devlog | Lancier Reveal" → Devlog / Lancier Reveal.
 */
export function parseTitle(fullTitle: string, eventType?: number) {
  const trimmed = fullTitle.trim();
  const versionMatch = VERSION_TITLE.exec(trimmed);
  if (versionMatch) {
    return { label: `v${versionMatch[1]}`, title: versionMatch[2].trim() || "Patch notes" };
  }
  const prefixMatch = PREFIXED_TITLE.exec(trimmed);
  if (prefixMatch) return { label: prefixMatch[1], title: prefixMatch[2] };
  return { label: (eventType !== undefined && EVENT_TYPE_LABELS[eventType]) || "News", title: trimmed };
}

function buildUpdate(item: NonNullable<NonNullable<NewsResponse["appnews"]>["newsitems"]>[number], event?: EventInfo): Update {
  const contents = item.contents ?? "";
  const { label, title } = parseTitle(item.title, event?.type);

  const inlineImage = bodyImages(contents).find(isSteamImage);
  const cardImage = event?.capsule ?? event?.banner ?? inlineImage;

  return {
    id: item.gid,
    title,
    fullTitle: item.title.trim(),
    label,
    date: new Date(item.date * 1000).toISOString(),
    excerpt: toExcerpt(contents),
    image: cardImage ? { url: cardImage, isFallback: false } : { url: FALLBACK_IMAGE, isFallback: true },
    steamUrl: item.url,
    author: item.author || null,
    banner: event?.banner ?? null,
    html: toHtml(contents),
  };
}

function toSummary({ id, title, label, date, excerpt, image, steamUrl }: Update): UpdateSummary {
  return { id, title, label, date, excerpt, image, steamUrl };
}
