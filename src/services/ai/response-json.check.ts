import assert from 'node:assert/strict';
import { readResponseJson } from './response-json';

async function main() {
  const controller = new AbortController();
  const stalled = readResponseJson({ json: () => new Promise(() => {}) }, controller.signal);
  const rejected = assert.rejects(stalled, /deadline/);
  controller.abort();
  await rejected;
  await assert.rejects(readResponseJson({ json: async () => ({}) }, controller.signal), /deadline/);
  const active = new AbortController();
  assert.deepEqual(await readResponseJson({ json: async () => ({ ok: true }) }, active.signal), {
    ok: true,
  });
  await assert.rejects(
    readResponseJson(
      {
        json: async () => {
          throw new SyntaxError('Invalid JSON');
        },
      },
      active.signal,
    ),
    SyntaxError,
  );
  console.log('AI response body deadline checks passed');
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
