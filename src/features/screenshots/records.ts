import type { PersistedScreenshotState } from '@/services/storage/types';
import type { RecallScreenshot } from './types';

export function restorePersistedScreenshotState(
  screenshots: RecallScreenshot[],
  persisted: Record<string, PersistedScreenshotState>,
): RecallScreenshot[] {
  return screenshots.map((screenshot) => {
    const restored = persisted[screenshot.id];
    return restored
      ? {
          ...screenshot,
          status: restored.status,
          analysis: restored.analysis ?? screenshot.analysis,
        }
      : screenshot;
  });
}

export function sortScreenshotsNewestFirst(screenshots: RecallScreenshot[]): RecallScreenshot[] {
  return [...screenshots].sort(
    (left, right) => (right.creationTime ?? 0) - (left.creationTime ?? 0),
  );
}
