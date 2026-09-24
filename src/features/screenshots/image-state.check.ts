import assert from 'node:assert/strict';
import { createScreenshotImageState, transitionScreenshotImageState } from './image-state';

const validUri = 'file:///storage/emulated/0/Pictures/Screenshots/valid.png';
const restoredUri = 'content://media/external/images/media/42';

assert.equal(createScreenshotImageState(validUri).status, 'loading', 'valid URI should load');
assert.equal(
  transitionScreenshotImageState(validUri, 'load').status,
  'loaded',
  'successful image render was not recorded',
);
assert.equal(
  transitionScreenshotImageState(validUri, 'error').status,
  'error',
  'render failure did not expose an error state',
);
assert.equal(
  createScreenshotImageState('file:///missing/local-asset.png').status,
  'loading',
  'missing local assets must be attempted before being marked failed',
);
assert.equal(
  transitionScreenshotImageState('file:///missing/local-asset.png', 'error').status,
  'error',
  'missing local asset did not become unavailable after decode failure',
);
assert.equal(
  createScreenshotImageState('').status,
  'unavailable',
  'empty URI should be unavailable',
);
assert.equal(
  transitionScreenshotImageState(restoredUri, 'load_start').status,
  'loading',
  'a restored source should return to loading',
);
assert.equal(
  transitionScreenshotImageState(restoredUri, 'load').status,
  'loaded',
  'a restored source should recover after loading',
);

console.log('Screenshot image-state checks passed');
