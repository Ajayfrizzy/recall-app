const MIN_SCREENSHOT_TIME_MS = Date.UTC(2000, 0, 1);
const MAX_FUTURE_DRIFT_MS = 24 * 60 * 60 * 1000;
const SECONDS_UPPER_BOUND = 100_000_000_000;

/** Normalizes Media Library and legacy persisted timestamps to Unix milliseconds. */
export function normalizeScreenshotCreationTime(
  value: number | null | undefined,
  now = Date.now(),
): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;

  const milliseconds = value < SECONDS_UPPER_BOUND ? value * 1000 : value;
  if (
    !Number.isFinite(milliseconds) ||
    milliseconds < MIN_SCREENSHOT_TIME_MS ||
    milliseconds > now + MAX_FUTURE_DRIFT_MS
  ) {
    return undefined;
  }

  return Math.trunc(milliseconds);
}
