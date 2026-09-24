import {
  formatScreenshotCreationDate,
  formatScreenshotCreationDateTime,
  normalizeScreenshotCreationTime,
} from './creation-time';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = Date.UTC(2026, 8, 24, 12);
const expected = Date.UTC(2026, 8, 20, 9, 30);
const historicalBugTimestamp = 1_790_194_348_800;

assert(
  new Date(historicalBugTimestamp * 1000).getUTCFullYear() === 58699,
  'historical impossible-year fixture no longer reproduces the original defect',
);
assert(
  normalizeScreenshotCreationTime(historicalBugTimestamp, now) === historicalBugTimestamp,
  'the timestamp that previously displayed as 58699 was double-converted',
);

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
  normalizeScreenshotCreationTime(Number.POSITIVE_INFINITY, now) === undefined,
  'infinite timestamps must be rejected',
);
assert(
  normalizeScreenshotCreationTime(undefined, now) === undefined,
  'missing values stay missing',
);
assert(
  formatScreenshotCreationDate(undefined, 'en-US') === undefined,
  'missing creation time should not produce a date',
);

const localDate = new Date(2026, 8, 23, 12, 30).getTime();
const listDate = formatScreenshotCreationDate(localDate, 'en-US');
assert(listDate === formatScreenshotCreationDate(localDate, 'en-US'), 'date formatting drifted');
assert(
  !listDate?.includes('58699'),
  'date-only screenshot formatting displayed the impossible year',
);
const detailDate = formatScreenshotCreationDateTime(localDate, 'en-US');
assert(
  detailDate === formatScreenshotCreationDateTime(localDate, 'en-US'),
  'detail timestamp formatting drifted',
);
assert(!detailDate?.includes('58699'), 'detail timestamp formatting displayed the impossible year');

console.log('Screenshot creation-time checks passed');
