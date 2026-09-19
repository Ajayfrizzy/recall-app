import { createUpcomingFingerprint, findDuplicateUpcoming } from './duplicates';
import type { UpcomingItem } from './types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const deadlineDate = new Date('2026-09-19T20:15:00.000Z').getTime();
const eventDate = new Date('2026-09-21T15:00:00.000Z').getTime();
const items: UpcomingItem[] = [
  {
    id: 'deadline-a:0',
    screenshotId: 'deadline-a',
    itemIndex: 0,
    type: 'deadline',
    title: 'Scholarship Application Deadline!',
    date: deadlineDate,
    createdAt: 1,
  },
  {
    id: 'event-a:0',
    screenshotId: 'event-a',
    itemIndex: 0,
    type: 'event',
    title: 'Startup Abuja Conference 2026',
    location: 'Abuja',
    date: eventDate,
    createdAt: 1,
    semanticFingerprint: createUpcomingFingerprint({
      type: 'event',
      title: 'Startup Abuja Conference 2026',
      location: 'Abuja',
      date: eventDate,
    }),
  },
];

assert(
  findDuplicateUpcoming(items, {
    type: 'deadline',
    title: '  scholarship application deadline  ',
    date: deadlineDate,
  })?.id === 'deadline-a:0',
  'exact deadline duplicate was not detected',
);
assert(
  findDuplicateUpcoming(items, {
    type: 'event',
    title: 'Startup Abuja Conference 2026',
    location: 'ABUJA',
    date: eventDate,
  })?.id === 'event-a:0',
  'exact event duplicate was not detected',
);
assert(
  !findDuplicateUpcoming(items, {
    type: 'deadline',
    title: 'Scholarship Application Deadline',
    date: deadlineDate + 24 * 60 * 60 * 1000,
  }),
  'same title with a different date produced a false positive',
);
assert(
  !findDuplicateUpcoming(
    [
      {
        id: 'incomplete:0',
        screenshotId: 'incomplete',
        itemIndex: 0,
        type: 'deadline',
        title: 'Scholarship Application Deadline',
        createdAt: 1,
      },
    ],
    { type: 'deadline', title: 'Scholarship Application Deadline', date: deadlineDate },
  ),
  'an item without enough data produced a false positive',
);

console.log('Upcoming duplicate checks passed');
