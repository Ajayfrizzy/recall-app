import type { RecallScreenshot } from './types';

export type ScreenshotHistoryFilter = 'all' | 'kept' | 'processed';

export function filterScreenshotHistory(
  screenshots: RecallScreenshot[],
  filter: ScreenshotHistoryFilter,
): RecallScreenshot[] {
  return screenshots.filter(
    (screenshot) =>
      (screenshot.status === 'kept' || screenshot.status === 'processed') &&
      (filter === 'all' || screenshot.status === filter),
  );
}
