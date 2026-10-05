import "server-only";
import { getTrack, type Track } from "@/lib/tracks";
import { cached, peek, prime } from "./cache";
import { steamFetch, steamFetchText } from "./fetch";
import { xmlBlocks, xmlHas, xmlText } from "./xml";

const APP_ID = 2804240;
const LIST_TTL_MS = 5 * 60_000;
const BOARD_TTL_MS = 60_000;
const PLAYER_TTL_MS = 24 * 60 * 60_000;
/** Lookups that failed are retried sooner, but not on every request. */
const PLAYER_FALLBACK_TTL_MS = 5 * 60_000;
const PAGE_SIZE = 5000; // Steam's maximum per request
const PROFILE_CONCURRENCY = 6;

// Steam's ELeaderboardDisplayType
const TIME_SECONDS = 2;

export type LeaderboardEntry = {
  rank: number;
  steamId: string;
  name: string;
  /** 64px avatar, or null when it couldn't be looked up. */
  avatar: string | null;
  timeMs: number;
  /** Behind first place; 0 for the leader. */
  gapMs: number;
};

export type Leaderboard = {
  track: Track;
  total: number;
  entries: LeaderboardEntry[];
};

type Board = { id: string; displayType: number };
type Player = { name: string; avatar: string | null };

type PlayerSummariesResponse = {
  response?: { players?: { steamid: string; personaname?: string; avatarmedium?: string }[] };
};

/**
 * Every entry on a track's leaderboard, fastest first, with player names and avatars.
 * Null if there's no such track. Cached for 60s.
 */
export async function getLeaderboard(code: string): Promise<Leaderboard | null> {
  const track = getTrack(code);
  if (!track) return null;

  return cached(`leaderboards:${track.code}`, BOARD_TTL_MS, async () => {
    const board = (await getBoards()).get(track.board);
    if (!board) {
      console.error(`[leaderboards] no Steam board named "${track.board}"`);
      return { track, total: 0, entries: [] };
    }

    const rows = await fetchEntries(board.id);
    const players = await getPlayers(rows.map((row) => row.steamId));
    const toMs = (score: number) => (board.displayType === TIME_SECONDS ? score * 1000 : score);
    const best = rows.length ? toMs(rows[0].score) : 0;

    const entries = rows.map((row): LeaderboardEntry => {
      const player = players.get(row.steamId) ?? fallbackPlayer(row.steamId);
      return { rank: row.rank, steamId: row.steamId, ...player, timeMs: toMs(row.score), gapMs: toMs(row.score) - best };
    });
    return { track, total: entries.length, entries };
  });
}

/** Steam's boards for the game, by name. Cached for 5 min. */
function getBoards(): Promise<Map<string, Board>> {
  return cached("leaderboards:list", LIST_TTL_MS, async () => {
    const xml = await steamFetchText(`https://steamcommunity.com/stats/${APP_ID}/leaderboards/`, { xml: 1 });
    const boards = new Map<string, Board>();
    for (const block of xmlBlocks(xml, "leaderboard")) {
      const id = xmlText(block, "lbid");
      const name = xmlText(block, "name");
      if (id && name) boards.set(name.trim(), { id, displayType: Number(xmlText(block, "displaytype")) });
    }
    if (boards.size === 0) throw new Error("Steam returned no leaderboards");
    return boards;
  });
}

/** All rows of one board, paging while Steam says there are more. */
async function fetchEntries(boardId: string) {
  const rows: { rank: number; steamId: string; score: number }[] = [];
  for (let start = 1; ; start += PAGE_SIZE) {
    const xml = await steamFetchText(`https://steamcommunity.com/stats/${APP_ID}/leaderboards/${boardId}/`, {
      xml: 1,
      start,
      end: start + PAGE_SIZE - 1,
    });
    const page = xmlBlocks(xmlBlocks(xml, "entries")[0] ?? "", "entry");
    for (const entry of page) {
      rows.push({
        rank: Number(xmlText(entry, "rank")),
        steamId: xmlText(entry, "steamid") ?? "",
        score: Number(xmlText(entry, "score")),
      });
    }
    if (page.length === 0 || !xmlHas(xml, "nextRequestURL")) return rows;
  }
}

/**
 * Names and avatars, cached per player for 24h. Uses GetPlayerSummaries when STEAM_API_KEY is set,
 * otherwise each player's public profile XML. Never throws: players that can't be looked up get their Steam ID.
 */
async function getPlayers(steamIds: string[]): Promise<Map<string, Player>> {
  const players = new Map<string, Player>();
  const missing: string[] = [];
  for (const id of new Set(steamIds)) {
    const hit = peek<Player>(`player:${id}`);
    if (hit) players.set(id, hit);
    else missing.push(id);
  }
  if (missing.length === 0) return players;

  const key = process.env.STEAM_API_KEY;
  const found = key ? await fetchPlayerSummaries(missing, key) : await fetchProfiles(missing);
  for (const id of missing) {
    const player = found.get(id);
    if (player) prime(`player:${id}`, PLAYER_TTL_MS, player);
    else prime(`player:${id}`, PLAYER_FALLBACK_TTL_MS, fallbackPlayer(id));
    players.set(id, player ?? fallbackPlayer(id));
  }
  return players;
}

async function fetchPlayerSummaries(ids: string[], key: string) {
  const found = new Map<string, Player>();
  for (let i = 0; i < ids.length; i += 100) {
    try {
      const data = await steamFetch<PlayerSummariesResponse>("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/", {
        key,
        steamids: ids.slice(i, i + 100).join(","),
      });
      for (const p of data.response?.players ?? []) {
        found.set(p.steamid, { name: p.personaname?.trim() || p.steamid, avatar: p.avatarmedium || null });
      }
    } catch (error) {
      console.error("[leaderboards] could not fetch player summaries", error);
    }
  }
  return found;
}

/** Public profile XML for each player, a few at a time so a cold cache doesn't burst Steam. */
async function fetchProfiles(ids: string[]) {
  const found = new Map<string, Player>();
  const queue = [...ids];
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      try {
        const xml = await steamFetchText(`https://steamcommunity.com/profiles/${id}/`, { xml: 1 });
        const name = xmlText(xml, "steamID")?.trim();
        if (name) found.set(id, { name, avatar: xmlText(xml, "avatarMedium") || null });
      } catch (error) {
        console.error(`[leaderboards] could not fetch profile ${id}`, error);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PROFILE_CONCURRENCY, ids.length) }, worker));
  return found;
}

function fallbackPlayer(steamId: string): Player {
  return { name: steamId, avatar: null };
}
