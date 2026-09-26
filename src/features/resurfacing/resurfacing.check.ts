import type { RecallBundle } from '@/features/bundles/types';
import type { LibraryItem } from '@/features/library/types';
import { formatScheduledDateTime } from '@/features/upcoming/format';
import { migratePersistedState } from '@/services/storage/migrations';
import { getSubscriptionLimits } from '@/features/subscription/features';
import {
  generateBundleCards,
  generateContentCards,
  generateResurfacingCards,
  generateSummaryCard,
  generateUpcomingCards,
} from './generate';
import { daysUntil, nextLocalMidnight } from './time';
import { nextResurfacingRefresh, snoozeIdentity } from './preferences';
import { RESURFACING_PRIORITY, type ResurfacingPreference } from './types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function localDate(year: number, month: number, day: number, hour = 12, minute = 0): number {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

const now = localDate(2026, 9, 20, 11);
const baseUpcoming = {
  screenshotId: 'source-screenshot',
  itemIndex: 0,
  createdAt: now - 10_000,
};
const deadlineTomorrow = {
  ...baseUpcoming,
  id: 'scholarship',
  type: 'deadline' as const,
  title: 'Scholarship application deadline',
  date: localDate(2026, 9, 21, 17),
};
const deadlineToday = { ...deadlineTomorrow, date: localDate(2026, 9, 20, 17) };
const overdueDeadline = { ...deadlineTomorrow, date: localDate(2026, 9, 19, 17) };
const eventInThreeDays = {
  ...baseUpcoming,
  id: 'startup-abuja',
  type: 'event' as const,
  title: 'Startup Abuja Conference',
  location: 'Abuja',
  date: localDate(2026, 9, 23, 8),
};

const tomorrowCard = generateUpcomingCards([deadlineTomorrow], now)[0];
assert(tomorrowCard.id === 'deadline:scholarship:tomorrow', 'tomorrow ID is not deterministic');
assert(tomorrowCard.scheduledAt === deadlineTomorrow.date, 'upcoming card lost its scheduled date');
assert(
  tomorrowCard.action?.route === `/screenshot/${deadlineTomorrow.screenshotId}`,
  'upcoming card lost its Open destination',
);
assert(tomorrowCard.message.includes('is tomorrow'), 'deadline tomorrow wording is incorrect');
assert(
  tomorrowCard.priority === RESURFACING_PRIORITY.DEADLINE_TOMORROW,
  'deadline tomorrow priority is incorrect',
);

const todayCard = generateUpcomingCards([deadlineToday], now)[0];
assert(todayCard.id.endsWith(':today'), 'deadline today bucket is incorrect');
assert(todayCard.message.includes('is today'), 'deadline today wording is incorrect');

const overdueCard = generateUpcomingCards([overdueDeadline], now)[0];
assert(overdueCard.id.endsWith(':overdue'), 'overdue deadline bucket is incorrect');
assert(overdueCard.message.includes('has passed'), 'overdue wording is incorrect');
assert(
  overdueCard.priority === RESURFACING_PRIORITY.OVERDUE_DEADLINE,
  'overdue deadline must have highest priority',
);

const eventCard = generateUpcomingCards([eventInThreeDays], now)[0];
assert(eventCard.id.endsWith(':3days'), 'event within three days has the wrong bucket');
assert(eventCard.message.includes('in 3 days in Abuja'), 'event location wording is incorrect');
assert(
  formatScheduledDateTime(deadlineTomorrow.date, 'en-US') === 'Sep 21 · 5:00 PM',
  'scheduled date formatting is incorrect',
);

const sameTitleCards = generateUpcomingCards(
  [
    deadlineTomorrow,
    { ...deadlineTomorrow, id: 'scholarship-later', date: localDate(2026, 9, 22, 17) },
  ],
  now,
);
assert(sameTitleCards.length === 2, 'same-title reminders were incorrectly merged');
assert(
  sameTitleCards[0].scheduledAt !== sameTitleCards[1].scheduledAt,
  'same-title reminders lost their distinct scheduled dates',
);

assert(
  daysUntil(localDate(2026, 9, 21, 8), localDate(2026, 9, 20, 23, 30)) === 1,
  'local calendar boundary was treated as a 24-hour duration',
);

const duplicateEventCards = generateResurfacingCards(
  { upcoming: [eventInThreeDays, eventInThreeDays], library: [], bundles: [] },
  [],
  now,
  10,
);
assert(
  duplicateEventCards.filter((card) => card.id === eventCard.id).length === 1,
  'duplicate event occurrences were not removed',
);

const priorityCards = generateResurfacingCards(
  {
    upcoming: [deadlineTomorrow, overdueDeadline, eventInThreeDays],
    library: [],
    bundles: [],
  },
  [],
  now,
);
assert(priorityCards.length === 3, 'Home card limit is not three');
assert(
  priorityCards.every(
    (card, index) => index === 0 || priorityCards[index - 1].priority >= card.priority,
  ),
  'cards are not priority sorted',
);

const fiveUpcoming = [
  overdueDeadline,
  deadlineToday,
  deadlineTomorrow,
  eventInThreeDays,
  { ...eventInThreeDays, id: 'second-event', title: 'Second event' },
];
const fiveUpcomingSnapshot = JSON.stringify(fiveUpcoming);
assert(
  generateResurfacingCards(
    { upcoming: fiveUpcoming, library: [], bundles: [] },
    [],
    now,
    getSubscriptionLimits(false).resurfacingCards,
  ).length === 3,
  'free resurfacing exceeded three cards',
);
assert(
  generateResurfacingCards(
    { upcoming: fiveUpcoming, library: [], bundles: [] },
    [],
    now,
    getSubscriptionLimits(true).resurfacingCards,
  ).length === 5,
  'Pro resurfacing did not expose five cards',
);
assert(JSON.stringify(fiveUpcoming) === fiveUpcomingSnapshot, 'resurfacing changed Upcoming data');

const dismissed: ResurfacingPreference = { id: tomorrowCard.id, dismissedAt: now };
assert(
  generateResurfacingCards(
    { upcoming: [deadlineTomorrow], library: [], bundles: [] },
    [dismissed],
    now,
  ).length === 0,
  'dismissed occurrence remained visible',
);
const snoozed: ResurfacingPreference = {
  id: eventCard.id,
  snoozedUntil: now + 24 * 60 * 60 * 1000,
};
const day = 24 * 60 * 60 * 1000;
const deadlineSnooze = { id: todayCard.id, snoozedUntil: now + day };
const deadlineSources = { upcoming: [deadlineToday], library: [], bundles: [] };
for (const time of [nextLocalMidnight(now), now + day - 1]) {
  assert(
    generateResurfacingCards(deadlineSources, [deadlineSnooze], time).length === 0,
    'deadline snooze ended early when today became overdue',
  );
}
assert(
  generateResurfacingCards(deadlineSources, [deadlineSnooze], now + day)[0]?.bucket === 'overdue',
  'deadline did not return at the exact 24-hour expiry',
);
assert(
  generateResurfacingCards(deadlineSources, [{ id: todayCard.id, dismissedAt: now }], now + day)
    .length === 1,
  'dismissal must remain occurrence-specific',
);
assert(
  generateResurfacingCards(
    { ...deadlineSources, upcoming: [{ ...deadlineToday, id: 'another-deadline' }] },
    [deadlineSnooze],
    now,
  ).length === 1,
  'snooze hid an unrelated deadline',
);
const afterMidnight = nextLocalMidnight(now);
assert(nextResurfacingRefresh([deadlineSnooze], now) === afterMidnight, 'midnight refresh lost');
assert(
  nextResurfacingRefresh([deadlineSnooze], afterMidnight) === now + day,
  'expiry refresh not scheduled after midnight',
);
assert(
  nextResurfacingRefresh([deadlineSnooze], now + day) === nextLocalMidnight(now + day),
  'expired snooze caused a refresh loop',
);
assert(
  nextResurfacingRefresh([deadlineSnooze, { id: 'other', snoozedUntil: now + 1000 }], now) ===
    now + 1000,
  'refresh must use the earliest pending expiry',
);
assert(
  snoozeIdentity('bundle:shopping:example:recent:2026-09-20') ===
    snoozeIdentity('bundle:shopping:example:recent:2026-09-21'),
  'bundle update changed snooze identity',
);
assert(
  snoozeIdentity('summary:week:2026-38') === snoozeIdentity('summary:week:2026-39'),
  'week rollover changed summary snooze identity',
);
assert(
  generateResurfacingCards(
    { upcoming: [eventInThreeDays], library: [], bundles: [] },
    [snoozed],
    now,
  ).length === 0,
  'snoozed occurrence remained visible',
);
assert(
  generateResurfacingCards(
    { upcoming: [eventInThreeDays], library: [], bundles: [] },
    [snoozed],
    now + 25 * 60 * 60 * 1000,
  ).some((card) => card.upcomingId === eventInThreeDays.id),
  'expired snooze did not reveal the item',
);
assert(
  generateResurfacingCards(
    { upcoming: [deadlineToday], library: [], bundles: [] },
    [dismissed],
    now,
  ).some((card) => card.id.endsWith(':today')),
  'dismissed tomorrow occurrence suppressed the new today occurrence',
);

const recentBundle: RecallBundle = {
  id: 'bundle:shopping:ingrem',
  title: 'INGREM Products',
  type: 'shopping',
  screenshotIds: ['ingrem'],
  itemRefs: [
    { screenshotId: 'ingrem', itemIndex: 0 },
    { screenshotId: 'ingrem', itemIndex: 1 },
  ],
  createdAt: now - 2 * 60 * 60 * 1000,
  updatedAt: now - 2 * 60 * 60 * 1000,
  status: 'active',
};
assert(
  generateBundleCards([recentBundle], now).length === 1,
  'recent active bundle did not surface',
);
assert(
  generateBundleCards([{ ...recentBundle, status: 'archived' }], now).length === 0,
  'archived bundle surfaced',
);
assert(
  generateBundleCards([{ ...recentBundle, itemRefs: [], screenshotIds: [] }], now).length === 0,
  'fully excluded bundle surfaced',
);

const readLater: LibraryItem = {
  id: 'article',
  screenshotId: 'article-shot',
  itemIndex: 0,
  type: 'content',
  title: 'A useful article',
  summary: 'Read this later',
  createdAt: now - 25 * 60 * 60 * 1000,
};
assert(
  generateContentCards([readLater], now).length === 1,
  'eligible Read Later item did not surface',
);
assert(
  generateContentCards([{ ...readLater, createdAt: now - 23 * 60 * 60 * 1000 }], now).length === 0,
  'Read Later item surfaced before 24 hours',
);
assert(
  generateContentCards([{ ...readLater, createdAt: now - 8 * 24 * 60 * 60 * 1000 }], now).length ===
    0,
  'Read Later item surfaced after seven days',
);

assert(
  generateSummaryCard([deadlineTomorrow, eventInThreeDays], now)?.message ===
    '1 deadline and 1 event coming up.',
  'weekly summary counts are incorrect',
);

const ignoredState = migratePersistedState({
  version: 1,
  screenshots: { 'source-screenshot': { status: 'ignored' } },
  library: [],
  upcoming: [deadlineTomorrow],
  actions: [],
  bundles: [],
  bundleItemOverrides: [],
  resurfacingPreferences: [],
  semanticAnalysisAcknowledged: false,
  onboardingCompleted: true,
});
assert(
  ignoredState.screenshots['source-screenshot'].status === 'ignored' &&
    generateUpcomingCards(ignoredState.upcoming, now).length === 1,
  'ignored screenshot status incorrectly cancelled durable Upcoming data',
);

const persistenceNow = Date.now();
const persistedDismissed = { id: tomorrowCard.id, dismissedAt: persistenceNow };
const persistedSnoozed = { id: eventCard.id, snoozedUntil: persistenceNow + 24 * 60 * 60 * 1000 };
const restored = migratePersistedState({
  version: 1,
  screenshots: {},
  library: [],
  upcoming: [deadlineTomorrow],
  actions: [],
  bundles: [],
  bundleItemOverrides: [],
  resurfacingPreferences: [
    persistedDismissed,
    persistedSnoozed,
    { ...persistedDismissed, dismissedAt: persistenceNow - 1 },
    { id: 'old-occurrence', dismissedAt: persistenceNow - 91 * 24 * 60 * 60 * 1000 },
  ],
  semanticAnalysisAcknowledged: false,
  onboardingCompleted: true,
});
assert(
  restored.resurfacingPreferences.length === 2,
  'preferences were not deduplicated on restore',
);
assert(
  restored.resurfacingPreferences.find((item) => item.id === persistedDismissed.id)?.dismissedAt ===
    persistenceNow,
  'latest dismissal did not survive restore',
);
assert(
  restored.resurfacingPreferences.find((item) => item.id === persistedSnoozed.id)?.snoozedUntil ===
    persistedSnoozed.snoozedUntil,
  'snooze did not survive restore',
);

console.log('Smart Resurfacing checks passed');
