import { RateLimitExceededError } from './errors.js';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

type RateLimitEntry = { count: number; resetAt: number };
const requestsByAddress = new Map<string, RateLimitEntry>();

export function checkAnalysisRateLimit(address: string | undefined, now = Date.now()): void {
  const key = address || 'unknown';
  const current = requestsByAddress.get(key);

  if (!current || current.resetAt <= now) {
    requestsByAddress.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) throw new RateLimitExceededError();
  current.count += 1;
}
