import { createUpcomingFingerprint } from '@/features/upcoming/duplicates';
import { migratePersistedState } from './migrations';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const date = new Date('2026-09-19T20:15:00.000Z').getTime();
const restored = migratePersistedState({
  version: 1,
  screenshots: { screenshot: { status: 'processed' } },
  library: [
    {
      id: 'screenshot:0',
      screenshotId: 'screenshot',
      itemIndex: 0,
      createdAt: 1,
      type: 'content',
      summary: 'Saved content',
    },
  ],
  upcoming: [
    {
      id: 'deadline:0',
      screenshotId: 'deadline',
      itemIndex: 0,
      type: 'deadline',
      title: 'Scholarship application deadline',
      date,
      createdAt: 1,
    },
  ],
  actions: [],
  semanticAnalysisAcknowledged: true,
  onboardingCompleted: true,
});

assert(restored.version === 1, 'v1 state version changed');
assert(restored.screenshots.screenshot?.status === 'processed', 'screenshot metadata was dropped');
assert(restored.library.length === 1, 'library items were dropped');
assert(restored.upcoming.length === 1, 'upcoming items were dropped');
assert(restored.actions.length === 2, 'durable actions were not reconstructed');
assert(restored.semanticAnalysisAcknowledged, 'semantic acknowledgement was dropped');
assert(restored.onboardingCompleted, 'onboarding state was dropped');
assert(
  restored.upcoming[0].semanticFingerprint ===
    createUpcomingFingerprint({
      type: 'deadline',
      title: 'Scholarship application deadline',
      date,
    }),
  'legacy upcoming fingerprint was not derived',
);

console.log('Persistence migration checks passed');
