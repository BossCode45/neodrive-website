import type { NextRequest } from "next/server";
import { getUpdate } from "@/lib/steam/updates";

const CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=60";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/updates/[id]">) {
  const { id } = await ctx.params;

  try {
    const update = await getUpdate(id);
    if (!update) return Response.json({ error: "Update not found" }, { status: 404 });
    return Response.json(update, { headers: { "Cache-Control": CACHE_CONTROL } });
  } catch (error) {
    console.error(`[api/updates/${id}]`, error);
    return Response.json({ error: "Could not load updates from Steam" }, { status: 502 });
  }
}
