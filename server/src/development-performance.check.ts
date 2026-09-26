import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { developmentRequestId, logDevelopmentPerformance } from './development-performance.js';

function requestWithHeader(value: string | string[] | undefined): Pick<IncomingMessage, 'headers'> {
  return { headers: { 'x-recall-request-id': value } };
}

const validRequestId = 'dev-mxyz1234-abcd1234';
assert.equal(developmentRequestId(requestWithHeader(validRequestId)), validRequestId);
assert.equal(developmentRequestId(requestWithHeader('contains private text')), undefined);
assert.equal(developmentRequestId(requestWithHeader('dev-short-token')), undefined);
assert.equal(developmentRequestId(requestWithHeader(undefined)), undefined);

const originalInfo = console.info;
const entries: unknown[][] = [];
console.info = (...values: unknown[]) => entries.push(values);
try {
  logDevelopmentPerformance(validRequestId, {
    stage: 'backend_request',
    durationMs: 12.5,
    outcome: 'ok',
    statusCode: 200,
  });
  logDevelopmentPerformance(undefined, {
    stage: 'backend_request',
    durationMs: 20,
    outcome: 'failed',
  });
} finally {
  console.info = originalInfo;
}

assert.equal(entries.length, 1);
assert.deepEqual(entries[0], [
  '[recall-performance]',
  {
    requestId: validRequestId,
    stage: 'backend_request',
    durationMs: 12.5,
    outcome: 'ok',
    statusCode: 200,
  },
]);

console.log('Development performance correlation and logging checks passed');
