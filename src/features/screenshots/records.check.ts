import assert from 'node:assert/strict';
import { createIdleScreenshotAnalysis } from '@/services/understanding';
import type { RecallScreenshot } from './types';
import { restorePersistedScreenshotState, sortScreenshotsNewestFirst } from './records';

function screenshot(id: string, creationTime?: number): RecallScreenshot {
  return {
    id,
    uri: `content://media/${id}`,
    filename: `${id}.png`,
    width: 1080,
    height: 2400,
    creationTime,
    status: 'pending',
    analysis: createIdleScreenshotAnalysis(),
  };
}

const currentAsset = screenshot('persisted', 1_790_194_348_800);
const restored = restorePersistedScreenshotState([currentAsset], {
  persisted: { status: 'processed' },
});

assert.equal(restored[0].status, 'processed', 'persisted screenshot status was not restored');
assert.equal(
  restored[0].creationTime,
  currentAsset.creationTime,
  'persisted state replaced fresh Media Library creation time',
);
assert.equal(restored[0].uri, currentAsset.uri, 'persisted state replaced the current asset URI');

const sorted = sortScreenshotsNewestFirst([
  screenshot('older', 1_700_000_000_000),
  screenshot('missing'),
  screenshot('newest', 1_790_000_000_000),
]);
assert.deepEqual(
  sorted.map((item) => item.id),
  ['newest', 'older', 'missing'],
  'screenshots are not sorted newest first with missing dates last',
);

console.log('Screenshot record checks passed');
