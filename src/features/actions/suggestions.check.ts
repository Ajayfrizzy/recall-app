import assert from 'node:assert/strict';
import type { RecallItem } from '@/services/ai/types';
import { suggestedActionTypeForItem } from './suggestions';

const legacyProduct: RecallItem = {
  type: 'product',
  title: 'Desk',
  confidence: 0.9,
};
assert.equal(
  suggestedActionTypeForItem(legacyProduct, ['save_product']),
  'save_product',
  'legacy saved analyses must continue to render their global action',
);

const actionlessStatus: RecallItem = {
  type: 'general',
  suggestedAction: null,
  summary: 'Temporary charging status.',
  confidence: 0.95,
};
assert.equal(
  suggestedActionTypeForItem(actionlessStatus, ['keep']),
  undefined,
  'an explicit actionless item must not fall back to Keep',
);

const actionlessNotification: RecallItem = {
  type: 'content',
  suggestedAction: null,
  source: 'Social app',
  summary: 'Truncated notification.',
  dates: [],
  confidence: 0.8,
};
assert.equal(
  suggestedActionTypeForItem(actionlessNotification, ['read_later']),
  undefined,
  'an explicit actionless content item must not render Read Later',
);

const event: RecallItem = {
  type: 'event',
  suggestedAction: 'add_to_calendar',
  title: 'Conference',
  dates: [],
  confidence: 0.9,
};
assert.equal(suggestedActionTypeForItem(event, []), 'add_to_calendar');

const deadline: RecallItem = {
  type: 'deadline',
  suggestedAction: 'create_reminder',
  title: 'Application deadline',
  dates: [],
  confidence: 0.9,
};
assert.equal(suggestedActionTypeForItem(deadline, []), 'create_reminder');

assert.equal(
  suggestedActionTypeForItem({ ...legacyProduct, suggestedAction: 'read_later' }, []),
  undefined,
  'an action that does not match the item type must not render',
);

console.log('Suggested action rendering checks passed');
