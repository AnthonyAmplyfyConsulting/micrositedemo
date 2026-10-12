import 'server-only'

/**
 * Lightweight fixed-window rate limiter.
 *
 * State lives in the memory of each server instance, so on serverless hosts
 * (Vercel) limits are per-instance rather than global. That still stops casual
 * abuse and brute-force loops from a single client. For stronger, global limits
 * add a Vercel Firewall rate-limit rule or a shared store (e.g. Upstash Redis).
 */
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const MAX_KEYS = 10_000

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  // Still full after removing expired keys: drop the oldest entries.
  if (buckets.size >= MAX_KEYS) {
    const excess = buckets.size - MAX_KEYS + 1000
    let i = 0
    for (const key of buckets.keys()) {
      if (i++ >= excess) break
      buckets.delete(key)
    }
  }
}

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number }

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  prune(now)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSeconds: 0 }
  }
  bucket.count += 1
  if (bucket.count > limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfterSeconds: 0 }
}
