import "server-only";

const USER_AGENT = "neodrive-website/1.0 (+https://store.steampowered.com/app/2804240)";
const RETRY_DELAYS_MS = [1000, 2000, 4000];

/** GET a Steam URL and parse it as JSON, retrying failed requests with backoff. */
export async function steamFetch<T>(url: string, params: Record<string, string | number> = {}): Promise<T> {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, String(value));

  for (let attempt = 0; ; attempt++) {
    try {
      if (process.env.NODE_ENV !== "production") console.debug(`[steam] GET ${target.origin}${target.pathname}`);
      const res = await fetch(target, {
        headers: { "User-Agent": USER_AGENT },
        cache: "no-store", // our own in-memory cache decides freshness
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return (await res.json()) as T;
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length) {
        throw new Error(`Steam request failed: ${target.origin}${target.pathname}`, { cause: error });
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}
