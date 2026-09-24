import { canUseCleanupBatch, getSubscriptionLimits } from './features';
import {
  didRestorePro,
  getCurrentOffering,
  getRevenueCatAvailability,
  hasActiveRevenueCatAccess,
  hasActiveProEntitlement,
  isPurchaseCancellation,
  loadSubscriptionResources,
  judgeIdentityAction,
} from './logic';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const inactive = { entitlements: { active: {} } };
const active = { entitlements: { active: { pro: { isActive: true } } } };
assert(!hasActiveProEntitlement(inactive), 'inactive entitlement enabled Pro');
assert(hasActiveProEntitlement(active), 'active pro entitlement did not enable Pro');
assert(getCurrentOffering({ current: null }) === undefined, 'missing offering was not safe');

const missingKey = getRevenueCatAvailability('android', {});
assert(!missingKey.available && missingKey.reason === 'missing-key', 'missing key was accepted');
const web = getRevenueCatAvailability('web', { androidApiKey: 'test_key' });
assert(!web.available && web.reason === 'unsupported-platform', 'web attempted native billing');

const freeLimits = getSubscriptionLimits(false);
const proLimits = getSubscriptionLimits(true);
assert(freeLimits.cleanupBatchSize === 3, 'free cleanup limit is not three');
assert(freeLimits.resurfacingCards === 3, 'free resurfacing limit is not three');
assert(proLimits.cleanupBatchSize === Infinity, 'Pro cleanup is not unlimited');
assert(proLimits.resurfacingCards === 5, 'Pro resurfacing limit is not five');
assert(canUseCleanupBatch(3, false), 'free cleanup rejected three screenshots');
assert(!canUseCleanupBatch(4, false), 'free cleanup allowed more than three screenshots');
assert(canUseCleanupBatch(8, true), 'Pro cleanup rejected a larger batch');

assert(isPurchaseCancellation({ code: '1' }), 'RevenueCat cancellation code was treated as fatal');
assert(isPurchaseCancellation({ userCancelled: true }), 'user cancellation flag was ignored');
assert(
  !isPurchaseCancellation(new Error('network')),
  'network failure was treated as cancellation',
);
assert(didRestorePro(active), 'active restored entitlement was not recognized');
assert(!didRestorePro(inactive), 'empty restore result enabled Pro');
assert(hasActiveRevenueCatAccess(active), 'active access was not detected');
assert(
  judgeIdentityAction({
    currentAppUserId: '$RCAnonymousID:one',
    judgeAppUserId: 'recall_judge_one',
    anonymous: true,
    hasActiveAccess: false,
  }) === 'login',
  'an eligible anonymous judge customer was not identified',
);
assert(
  judgeIdentityAction({
    currentAppUserId: '$RCAnonymousID:paying',
    judgeAppUserId: 'recall_judge_one',
    anonymous: true,
    hasActiveAccess: true,
  }) === 'keep',
  'an existing paying anonymous customer must not be switched',
);
assert(
  judgeIdentityAction({
    currentAppUserId: 'existing_account',
    judgeAppUserId: 'recall_judge_one',
    anonymous: false,
    hasActiveAccess: false,
  }) === 'conflict',
  'an unrelated identified customer must not be replaced',
);

void (async () => {
  const failedResources = await loadSubscriptionResources(
    async () => Promise.reject(new Error('offline')),
    async () => undefined,
  );
  assert(failedResources.failed, 'RevenueCat failure escaped the safe resource boundary');
  assert(
    failedResources.customerInfo === undefined && failedResources.offering === undefined,
    'failed RevenueCat load created subscription state',
  );

  console.log('Subscription checks passed');
})();
