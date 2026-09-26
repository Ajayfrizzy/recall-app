import type { RecallBundle } from '@/features/bundles/types';
import type { LibraryItem } from '@/features/library/types';
import type { UpcomingItem } from '@/features/upcoming/types';
import { snoozeIdentity } from './preferences';
import {
  dateBucket,
  daysUntil,
  isWithinNextDays,
  localDateKey,
  localWeekKey,
  nextLocalMidnight,
} from './time';
import {
  MAX_RESURFACING_CARDS,
  RESURFACING_PRIORITY,
  type RecallResurfacingCard,
  type ResurfacingPreference,
} from './types';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface ResurfacingSources {
  upcoming: UpcomingItem[];
  library: LibraryItem[];
  bundles: RecallBundle[];
}

function priorityFor(item: UpcomingItem, bucket: ReturnType<typeof dateBucket>): number {
  if (bucket === 'overdue') return RESURFACING_PRIORITY.OVERDUE_DEADLINE;
  if (bucket === 'today') {
    return item.type === 'deadline'
      ? RESURFACING_PRIORITY.DEADLINE_TODAY
      : RESURFACING_PRIORITY.EVENT_TODAY;
  }
  if (bucket === 'tomorrow') {
    return item.type === 'deadline'
      ? RESURFACING_PRIORITY.DEADLINE_TOMORROW
      : RESURFACING_PRIORITY.EVENT_TOMORROW;
  }
  return bucket === '3days'
    ? RESURFACING_PRIORITY.WITHIN_THREE_DAYS
    : RESURFACING_PRIORITY.WITHIN_SEVEN_DAYS;
}

function timingMessage(item: UpcomingItem, now: number): string {
  const days = daysUntil(item.date!, now);
  const timing =
    days < 0
      ? 'has passed'
      : days === 0
        ? 'is today'
        : days === 1
          ? 'is tomorrow'
          : `is in ${days} days`;
  const location = item.type === 'event' && item.location ? ` in ${item.location}` : '';
  return `${item.title} ${timing}${location}.`;
}

export function generateUpcomingCards(
  upcoming: UpcomingItem[],
  now = Date.now(),
): RecallResurfacingCard[] {
  return upcoming.flatMap((item) => {
    if (!item.date) return [];
    const bucket = dateBucket(item.date, now);
    if (bucket === 'later' || (bucket === 'overdue' && item.type !== 'deadline')) return [];
    return [
      {
        id: `${item.type}:${item.id}:${bucket}`,
        type: item.type === 'deadline' ? ('deadline_soon' as const) : ('event_soon' as const),
        title: item.title,
        message: timingMessage(item, now),
        priority: priorityFor(item, bucket),
        createdAt: item.createdAt,
        ...(bucket === 'overdue' ? {} : { expiresAt: nextLocalMidnight(now) }),
        screenshotId: item.screenshotId,
        upcomingId: item.id,
        scheduledAt: item.date,
        bucket,
        action: {
          label: 'Open',
          route: item.screenshotId
            ? `/screenshot/${encodeURIComponent(item.screenshotId)}`
            : '/upcoming',
        },
      },
    ];
  });
}

export function generateBundleCards(
  bundles: RecallBundle[],
  now = Date.now(),
): RecallResurfacingCard[] {
  return bundles.flatMap((bundle) => {
    const age = now - bundle.updatedAt;
    if (bundle.status !== 'active' || bundle.itemRefs.length < 2 || age < 0 || age > 48 * HOUR_MS) {
      return [];
    }
    const count = bundle.itemRefs.length;
    const message =
      bundle.type === 'shopping'
        ? `${count} saved products.`
        : bundle.type === 'application'
          ? `${count} related screenshots.`
          : `${count} related items saved together.`;
    return [
      {
        id: `bundle:${bundle.id}:recent:${localDateKey(bundle.updatedAt)}`,
        type: 'saved_bundle' as const,
        title: bundle.title,
        message,
        priority: RESURFACING_PRIORITY.SAVED_BUNDLE,
        createdAt: bundle.updatedAt,
        expiresAt: bundle.updatedAt + 48 * HOUR_MS,
        bundleId: bundle.id,
        bucket: 'recent',
        action: {
          label: 'View bundle',
          route: `/bundle/${encodeURIComponent(bundle.id)}`,
        },
      },
    ];
  });
}

export function generateContentCards(
  library: LibraryItem[],
  now = Date.now(),
): RecallResurfacingCard[] {
  const content = library
    .filter((item) => item.type === 'content')
    .filter((item) => now - item.createdAt >= DAY_MS && now - item.createdAt <= 7 * DAY_MS)
    .sort((left, right) => right.createdAt - left.createdAt)[0];
  if (!content || content.type !== 'content') return [];
  return [
    {
      id: `content:${content.id}:read-later:${localDateKey(content.createdAt)}`,
      type: 'saved_content',
      title: content.title ?? 'Read later',
      message: 'You saved this to read later.',
      priority: RESURFACING_PRIORITY.SAVED_CONTENT,
      createdAt: content.createdAt,
      expiresAt: content.createdAt + 7 * DAY_MS,
      screenshotId: content.screenshotId,
      bucket: 'read-later',
      action: {
        label: 'Open',
        route: `/screenshot/${encodeURIComponent(content.screenshotId)}`,
      },
    },
  ];
}

export function generateSummaryCard(
  upcoming: UpcomingItem[],
  now = Date.now(),
): RecallResurfacingCard | undefined {
  const relevant = upcoming.filter(
    (item) => item.date !== undefined && isWithinNextDays(item.date, 7, now),
  );
  if (relevant.length < 2) return undefined;
  const deadlines = relevant.filter((item) => item.type === 'deadline').length;
  const events = relevant.length - deadlines;
  const parts = [
    deadlines ? `${deadlines} ${deadlines === 1 ? 'deadline' : 'deadlines'}` : '',
    events ? `${events} ${events === 1 ? 'event' : 'events'}` : '',
  ].filter(Boolean);
  return {
    id: `summary:week:${localWeekKey(now)}`,
    type: 'upcoming_summary',
    title: 'This week',
    message: `${parts.join(' and ')} coming up.`,
    priority: RESURFACING_PRIORITY.UPCOMING_SUMMARY,
    createdAt: now,
    expiresAt: nextLocalMidnight(now),
    bucket: 'week',
    action: { label: 'Open Upcoming', route: '/upcoming' },
  };
}

function preferenceAllows(
  card: RecallResurfacingCard,
  preferences: ResurfacingPreference[],
  now: number,
): boolean {
  const preference = preferences.find((candidate) => candidate.id === card.id);
  const snoozed = preferences.some(
    (candidate) =>
      candidate.snoozedUntil !== undefined &&
      candidate.snoozedUntil > now &&
      snoozeIdentity(candidate.id) === snoozeIdentity(card.id),
  );
  return !preference?.dismissedAt && !snoozed;
}

export function generateResurfacingCards(
  sources: ResurfacingSources,
  preferences: ResurfacingPreference[] = [],
  now = Date.now(),
  limit = MAX_RESURFACING_CARDS,
): RecallResurfacingCard[] {
  const summary = generateSummaryCard(sources.upcoming, now);
  const candidates = [
    ...generateUpcomingCards(sources.upcoming, now),
    ...(summary ? [summary] : []),
    ...generateBundleCards(sources.bundles, now),
    ...generateContentCards(sources.library, now),
  ];
  const unique = new Map<string, RecallResurfacingCard>();
  for (const card of candidates) {
    if (!unique.has(card.id) && preferenceAllows(card, preferences, now)) unique.set(card.id, card);
  }
  return [...unique.values()]
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        right.createdAt - left.createdAt ||
        left.id.localeCompare(right.id),
    )
    .slice(0, Math.max(0, limit));
}
