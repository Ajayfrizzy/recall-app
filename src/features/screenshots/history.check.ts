import { createIdleScreenshotAnalysis } from '@/services/understanding';
import { filterScreenshotHistory } from './history';
import type { RecallScreenshot, ScreenshotStatus } from './types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function screenshot(id: string, status: ScreenshotStatus): RecallScreenshot {
  return {
    id,
    uri: `file://${id}`,
    width: 100,
    height: 100,
    status,
    analysis: createIdleScreenshotAnalysis(),
  };
}

const screenshots = [
  screenshot('pending', 'pending'),
  screenshot('kept', 'kept'),
  screenshot('processed', 'processed'),
  screenshot('ignored', 'ignored'),
];

assert(
  filterScreenshotHistory(screenshots, 'kept')
    .map((item) => item.id)
    .join() === 'kept',
  'kept history is incorrect',
);
assert(
  filterScreenshotHistory(screenshots, 'processed')
    .map((item) => item.id)
    .join() === 'processed',
  'processed history is incorrect',
);
assert(
  filterScreenshotHistory(screenshots, 'all')
    .map((item) => item.id)
    .join() === 'kept,processed',
  'default history should hide pending and ignored screenshots',
);

console.log('Screenshot history checks passed');
