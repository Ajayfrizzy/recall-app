import type { ResurfacingPreference } from './types';
import { nextLocalMidnight } from './time';

// Keep occurrence IDs for dismissal, but compare snoozes by their source item.
// Normalize existing persisted IDs too, so active snoozes survive this update.
export function snoozeIdentity(id: string): string {
  if (/^(deadline|event):/.test(id)) {
    return id.replace(/:(overdue|today|tomorrow|3days|7days|later)$/, '');
  }
  if (id.startsWith('bundle:')) return id.replace(/:recent:\d{4}-\d{2}-\d{2}$/, '');
  if (id.startsWith('content:')) return id.replace(/:read-later:\d{4}-\d{2}-\d{2}$/, '');
  if (/^summary:week:\d{4}-\d{2}$/.test(id)) return 'summary:week';
  return id;
}

export function nextResurfacingRefresh(preferences: ResurfacingPreference[], now: number): number {
  return preferences.reduce(
    (next, preference) =>
      preference.snoozedUntil && preference.snoozedUntil > now
        ? Math.min(next, preference.snoozedUntil)
        : next,
    nextLocalMidnight(now),
  );
}

export const RESURFACING_PREFERENCE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export function pruneResurfacingPreferences(
  preferences: ResurfacingPreference[],
  now = Date.now(),
): ResurfacingPreference[] {
  const cutoff = now - RESURFACING_PREFERENCE_RETENTION_MS;
  const latest = new Map<string, ResurfacingPreference>();
  for (const preference of preferences) {
    const timestamp = Math.max(preference.dismissedAt ?? 0, preference.snoozedUntil ?? 0);
    if (timestamp < cutoff) continue;
    const current = latest.get(preference.id);
    const currentTimestamp = Math.max(current?.dismissedAt ?? 0, current?.snoozedUntil ?? 0);
    if (!current || timestamp >= currentTimestamp) latest.set(preference.id, preference);
  }
  return [...latest.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export function upsertResurfacingPreference(
  preferences: ResurfacingPreference[],
  next: ResurfacingPreference,
  now = Date.now(),
): ResurfacingPreference[] {
  return pruneResurfacingPreferences(
    [...preferences.filter((preference) => preference.id !== next.id), next],
    now,
  );
}
