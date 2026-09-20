import type { ResurfacingPreference } from './types';

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
