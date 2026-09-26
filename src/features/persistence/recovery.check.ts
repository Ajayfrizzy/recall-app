import assert from 'node:assert/strict';
import { saveWithRecovery } from './recovery';
import { decodeRecallState } from '@/services/storage/decode';
import { createEmptyPersistedState } from '@/services/storage/types';

async function main() {
  assert.deepEqual(decodeRecallState(null), createEmptyPersistedState());
  for (const corrupt of ['{', 'null', '{}', '{"version":999}']) {
    assert.throws(
      () => decodeRecallState(corrupt),
      'invalid saved data must not become empty state',
    );
  }
  const saved = { ...createEmptyPersistedState(), onboardingCompleted: true };
  assert.equal(decodeRecallState(JSON.stringify(saved)).onboardingCompleted, true);
  let attempts = 0;
  let retry: (() => void) | undefined;
  let complete = false;
  const writes: number[] = [];
  const first = saveWithRecovery(
    async () => {
      attempts++;
      if (attempts === 1) throw new Error('Device full');
      writes.push(1);
    },
    () =>
      new Promise<void>((resolve) => {
        retry = resolve;
      }),
  ).then(() => {
    complete = true;
  });
  const second = first.then(async () => {
    writes.push(2);
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(complete, false, 'failed write must not report success');
  assert.deepEqual(writes, [], 'later writes must wait for recovery');
  assert.equal(attempts, 1, 'must not retry in a tight loop');
  assert.ok(retry);
  retry();
  await second;
  assert.equal(complete, true);
  assert.deepEqual(writes, [1, 2], 'retry must preserve snapshot order');
  console.log('Persistence recovery checks passed');
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
