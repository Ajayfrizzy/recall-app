import { canUseCleanupBatch, getSubscriptionLimits } from './features';
import {
  activateJudgeProFlow,
  connectJudgeIdentity,
  didRestorePro,
  getCurrentOffering,
  getRevenueCatAvailability,
  hasActiveRevenueCatAccess,
  hasActiveProEntitlement,
  hasRevenueCatIdentityToProtect,
  isPurchaseCancellation,
  loadSubscriptionResources,
  judgeIdentityAction,
  reconcileSubscriptionFeedback,
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
assert(
  Object.keys(
    reconcileSubscriptionFeedback(active, {
      error: 'Recall Pro activation is still pending.',
      statusMessage: 'No active Pro entitlement was found.',
    }),
  ).length === 0,
  'fresh active CustomerInfo did not clear stale subscription feedback',
);
assert(
  reconcileSubscriptionFeedback(inactive, { error: 'Still pending' }).error === 'Still pending',
  'inactive CustomerInfo incorrectly cleared the pending state',
);
assert(hasActiveRevenueCatAccess(active), 'active access was not detected');
assert(
  hasRevenueCatIdentityToProtect({ allPurchasedProductIdentifiers: ['paid_product'] }),
  'an anonymous customer with purchase history was not protected',
);
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
  }) === 'conflict',
  'an existing paying anonymous customer must block identity switching',
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
  const identityCalls: string[] = [];
  const connected = await connectJudgeIdentity({
    judgeAppUserId: 'recall_judge_one',
    loadIdentity: async () => ({
      currentAppUserId: '$RCAnonymousID:one',
      anonymous: true,
      customerInfo: inactive,
    }),
    hasProtectedIdentity: hasRevenueCatIdentityToProtect,
    login: async (appUserId) => {
      identityCalls.push(`login:${appUserId}`);
    },
    invalidateCustomerInfo: async () => {
      identityCalls.push('invalidate');
    },
    refreshCustomerInfo: async () => {
      identityCalls.push('refresh');
      return active;
    },
  });
  assert(hasActiveProEntitlement(connected), 'fresh judge CustomerInfo did not confirm Pro');
  assert(
    identityCalls.join(',') === 'login:recall_judge_one,invalidate,refresh',
    'judge login and CustomerInfo refresh ran out of order',
  );

  let conflictingLogin = false;
  let conflictRejected = false;
  try {
    await connectJudgeIdentity({
      judgeAppUserId: 'recall_judge_one',
      loadIdentity: async () => ({
        currentAppUserId: 'existing_account',
        anonymous: false,
        customerInfo: inactive,
      }),
      hasProtectedIdentity: hasRevenueCatIdentityToProtect,
      login: async () => {
        conflictingLogin = true;
      },
      invalidateCustomerInfo: async () => undefined,
      refreshCustomerInfo: async () => active,
    });
  } catch (error) {
    conflictRejected =
      error instanceof Error && error.message.includes('existing subscription identity');
  }
  assert(conflictRejected, 'an unrelated identified customer was not rejected');
  assert(!conflictingLogin, 'an unrelated identified customer was overwritten');

  const activationCalls: string[] = [];
  const activation = await activateJudgeProFlow({
    connectIdentity: async () => {
      activationCalls.push('connect');
      return inactive;
    },
    provisionEntitlement: async () => {
      activationCalls.push('provision');
      return { proProvisioning: 'confirmed' as const };
    },
    refreshIdentity: async () => {
      activationCalls.push('invalidate-and-refresh');
      return active;
    },
    hasActiveEntitlement: hasActiveProEntitlement,
  });
  assert(
    activationCalls.join(',') === 'connect,provision,invalidate-and-refresh',
    'judge customer identity was not established before backend provisioning and verification',
  );
  assert(activation.active, 'fresh CustomerInfo did not verify the granted Pro entitlement');

  const failedActivationCalls: string[] = [];
  const recoveredActivation = await activateJudgeProFlow({
    connectIdentity: async () => {
      failedActivationCalls.push('connect');
      return inactive;
    },
    provisionEntitlement: async () => {
      failedActivationCalls.push('provision');
      throw new Error('grant failed');
    },
    refreshIdentity: async () => {
      failedActivationCalls.push('refresh');
      return active;
    },
    hasActiveEntitlement: hasActiveProEntitlement,
  });
  assert(
    recoveredActivation.active && recoveredActivation.provisioningError instanceof Error,
    'fresh active CustomerInfo did not recover a previously successful grant',
  );
  assert(
    failedActivationCalls.join(',') === 'connect,provision,refresh',
    'CustomerInfo was not refreshed after an ambiguous provisioning failure',
  );

  let inactiveGrantFailed = false;
  try {
    await activateJudgeProFlow({
      connectIdentity: async () => inactive,
      provisionEntitlement: async () => {
        throw new Error('grant failed');
      },
      refreshIdentity: async () => inactive,
      hasActiveEntitlement: hasActiveProEntitlement,
    });
  } catch {
    inactiveGrantFailed = true;
  }
  assert(inactiveGrantFailed, 'inactive Pro was enabled after a failed promotional grant');

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
