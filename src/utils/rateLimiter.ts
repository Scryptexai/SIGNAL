import { logger } from "./logger";

interface RateLimitState {
  count: number;
  windowStart: number; // epoch ms
}

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const X_FREE_TIER_LIMIT = 17;

let state: RateLimitState = { count: 0, windowStart: Date.now() };

/** Returns true if posting is allowed, false if rate limit reached. */
export function canPost(): boolean {
  const now = Date.now();
  if (now - state.windowStart >= WINDOW_MS) {
    state = { count: 0, windowStart: now };
    logger.info("Rate limit window reset");
  }
  const maxPerDay = parseInt(process.env.MAX_POSTS_PER_DAY ?? "3", 10);
  const effectiveLimit = Math.min(maxPerDay, X_FREE_TIER_LIMIT);
  return state.count < effectiveLimit;
}

/** Increment post counter after a successful post. */
export function recordPost(): void {
  state.count += 1;
  logger.info(`Rate limit: ${state.count}/${Math.min(parseInt(process.env.MAX_POSTS_PER_DAY ?? "3", 10), X_FREE_TIER_LIMIT)} posts today`);
}

export function getRateLimitStatus() {
  const maxPerDay = parseInt(process.env.MAX_POSTS_PER_DAY ?? "3", 10);
  const effectiveLimit = Math.min(maxPerDay, X_FREE_TIER_LIMIT);
  const resetAt = new Date(state.windowStart + WINDOW_MS).toISOString();
  return { count: state.count, limit: effectiveLimit, resetAt };
}
