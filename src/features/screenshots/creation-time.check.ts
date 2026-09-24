import { normalizeScreenshotCreationTime } from './creation-time';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = Date.UTC(2026, 8, 24, 12);
const expected = Date.UTC(2026, 8, 20, 9, 30);

assert(
  normalizeScreenshotCreationTime(expected, now) === expected,
  'millisecond timestamps must not be converted twice',
);
assert(
  normalizeScreenshotCreationTime(expected / 1000, now) === expected,
  'second timestamps must be converted to milliseconds',
);
assert(
  normalizeScreenshotCreationTime(now + 2 * 24 * 60 * 60 * 1000, now) === undefined,
  'impossible future timestamps must be rejected',
);
assert(
  normalizeScreenshotCreationTime(1, now) === undefined,
  'implausibly old timestamps rejected',
);
assert(normalizeScreenshotCreationTime(Number.NaN, now) === undefined, 'NaN must be rejected');
assert(
  normalizeScreenshotCreationTime(undefined, now) === undefined,
  'missing values stay missing',
);

console.log('Screenshot creation-time checks passed');
