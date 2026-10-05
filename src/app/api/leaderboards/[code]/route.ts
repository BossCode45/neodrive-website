import type { NextRequest } from "next/server";
import { getLeaderboard } from "@/lib/steam/leaderboards";

const CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=60";

function intParam(value: string | null, fallback: number, min: number, max: number) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isNaN(n) ? fallback : Math.min(Math.max(n, min), max);
}

export async function GET(request: NextRequest, ctx: RouteContext<"/api/leaderboards/[code]">) {
  const { code } = await ctx.params;
  const { searchParams } = request.nextUrl;
  const offset = intParam(searchParams.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER);
  const limit = intParam(searchParams.get("limit"), 12, 1, 100);

  try {
    const leaderboard = await getLeaderboard(code);
    if (!leaderboard) return Response.json({ error: "Track not found" }, { status: 404 });
    return Response.json(
      { entries: leaderboard.entries.slice(offset, offset + limit), total: leaderboard.total },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  } catch (error) {
    console.error(`[api/leaderboards/${code}]`, error);
    return Response.json({ error: "Could not load the leaderboard from Steam" }, { status: 502 });
  }
}
