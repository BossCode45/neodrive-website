import type { NextRequest } from "next/server";
import { getUpdates } from "@/lib/steam/updates";

const CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=60";

function intParam(value: string | null, fallback: number, min: number, max: number) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isNaN(n) ? fallback : Math.min(Math.max(n, min), max);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const offset = intParam(searchParams.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER);
  const limit = intParam(searchParams.get("limit"), 6, 1, 24);

  try {
    const updates = await getUpdates();
    return Response.json(
      { updates: updates.slice(offset, offset + limit), total: updates.length },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  } catch (error) {
    console.error("[api/updates]", error);
    return Response.json({ error: "Could not load updates from Steam" }, { status: 502 });
  }
}
