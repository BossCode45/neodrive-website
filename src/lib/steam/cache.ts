import "server-only";

type Entry = {
  value?: unknown;
  expires: number;
  pending?: Promise<unknown>;
};

// Kept on globalThis so the cache survives module reloads in dev.
const globalForCache = globalThis as typeof globalThis & { __steamCache?: Map<string, Entry> };
const store = (globalForCache.__steamCache ??= new Map<string, Entry>());

/**
 * Return the cached value for `key`, calling `loader` when it is missing or older than `ttlMs`.
 * Concurrent callers share one in-flight load. If a refresh fails, the stale value is served instead.
 */
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const entry = store.get(key);
  if (entry && "value" in entry && entry.expires > Date.now()) return entry.value as T;
  if (entry?.pending) return entry.pending as Promise<T>;

  const pending = loader().then(
    (value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    },
    (error) => {
      if (entry && "value" in entry) {
        console.error(`[cache] refresh of "${key}" failed, serving stale data`, error);
        // Keep the stale value for another TTL so a Steam outage isn't retried on every request.
        store.set(key, { value: entry.value, expires: Date.now() + ttlMs });
        return entry.value as T;
      }
      store.delete(key);
      throw error;
    },
  );
  store.set(key, { ...entry, expires: entry?.expires ?? 0, pending });
  return pending;
}

/** Store a value directly, e.g. to seed per-item entries from a list load. */
export function prime<T>(key: string, ttlMs: number, value: T) {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

/** The cached value for `key` if it is still fresh, without loading. */
export function peek<T>(key: string): T | undefined {
  const entry = store.get(key);
  return entry && "value" in entry && entry.expires > Date.now() ? (entry.value as T) : undefined;
}

/** Empty the cache. For tests. */
export function clearCache() {
  store.clear();
}
