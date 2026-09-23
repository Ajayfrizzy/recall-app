import assert from 'node:assert/strict';
import { formatRecallDate, parseExactDate, validateDateAction } from './date-safeguards';

assert.equal(parseExactDate('2026-02-29', '10:00'), null, 'invalid calendar dates must fail');
assert.equal(parseExactDate('2026-09-30', '17:00')?.getHours(), 17);

const now = new Date(2026, 8, 23, 12, 0);
assert.match(
  validateDateAction('deadline', new Date(2026, 8, 22, 17, 0), 'at_deadline', now) ?? '',
  /already passed/i,
);
assert.match(
  validateDateAction('deadline', new Date(2026, 8, 23, 13, 0), 'one_day_before', now) ?? '',
  /reminder time has already passed/i,
);
assert.equal(
  validateDateAction('deadline', new Date(2026, 8, 24, 17, 0), 'one_hour_before', now),
  undefined,
);
assert.equal(validateDateAction('event', new Date(2026, 8, 22, 17, 0), undefined, now), undefined);

assert.match(
  formatRecallDate({
    type: 'deadline',
    raw: 'September 30, 2026 at 5:00 PM',
    normalized: '2026-09-30T17:00',
    precision: 'exact',
    confidence: 0.9,
  }),
  /2026/,
);

console.log('Date safeguard checks passed');
