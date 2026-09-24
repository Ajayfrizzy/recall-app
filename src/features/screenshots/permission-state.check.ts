import assert from 'node:assert/strict';
import { getPermissionViewState, resolveScreenshotPermission } from './permission-state';

const response = {
  granted: false,
  canAskAgain: true,
  accessPrivileges: 'none' as const,
};

assert.equal(
  resolveScreenshotPermission({ ...response, status: 'undetermined' }, 'android'),
  'not_requested',
  'an unrequested permission was treated as denied',
);
assert.equal(
  resolveScreenshotPermission(
    { ...response, status: 'granted', granted: true, accessPrivileges: 'all' },
    'android',
  ),
  'granted',
);
assert.equal(
  resolveScreenshotPermission(
    { ...response, status: 'granted', granted: true, accessPrivileges: 'limited' },
    'android',
  ),
  'limited',
);
assert.equal(resolveScreenshotPermission({ ...response, status: 'denied' }, 'android'), 'denied');
assert.equal(
  getPermissionViewState({
    permission: 'denied',
    canAskAgain: false,
    loading: false,
    error: null,
  }),
  'blocked',
);
assert.equal(
  getPermissionViewState({
    permission: 'granted',
    canAskAgain: false,
    loading: false,
    error: null,
  }),
  'granted',
  'permission granted through Settings did not restore content',
);
assert.equal(
  getPermissionViewState({
    permission: 'denied',
    canAskAgain: true,
    loading: false,
    error: null,
  }),
  'denied',
  'a revoked permission was not detected',
);
const restrictedThenRestored = [
  getPermissionViewState({
    permission: 'denied',
    canAskAgain: false,
    loading: false,
    error: null,
  }),
  getPermissionViewState({
    permission: 'granted',
    canAskAgain: false,
    loading: false,
    error: null,
  }),
];
assert.deepEqual(
  restrictedThenRestored,
  ['blocked', 'granted'],
  'content did not recover after restricted media permission was restored',
);
assert.equal(
  getPermissionViewState({
    permission: 'granted',
    canAskAgain: true,
    loading: false,
    error: 'load failed',
  }),
  'error',
  'a screenshot loading failure did not expose a retryable error',
);
assert.equal(
  getPermissionViewState({
    permission: 'not_requested',
    canAskAgain: true,
    loading: false,
    error: null,
  }),
  'first_time',
);

console.log('Screenshot permission state checks passed');
