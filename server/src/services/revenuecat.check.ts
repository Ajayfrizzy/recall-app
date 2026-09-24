import assert from 'node:assert/strict';
import { grantJudgePromotionalEntitlement } from './revenuecat.js';

const expiresAt = Date.UTC(2026, 11, 23);
let requestCount = 0;
await grantJudgePromotionalEntitlement({
  appUserId: 'recall_judge_stable-id',
  expiresAt,
  config: { secretApiKey: 'secret_test', entitlementId: 'pro' },
  fetcher: async (input, init) => {
    requestCount += 1;
    assert.equal(
      input,
      'https://api.revenuecat.com/v1/subscribers/recall_judge_stable-id/entitlements/pro/promotional',
    );
    assert.equal((init?.headers as Record<string, string>).authorization, 'Bearer secret_test');
    assert.deepEqual(JSON.parse(String(init?.body)), { end_time_ms: expiresAt });
    return new Response(
      JSON.stringify({
        subscriber: { entitlements: { pro: { expires_date: new Date(expiresAt).toISOString() } } },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  },
});
assert.equal(requestCount, 1);

await assert.rejects(
  grantJudgePromotionalEntitlement({
    appUserId: 'recall_judge_retry',
    expiresAt,
    config: { secretApiKey: 'secret_test', entitlementId: 'pro' },
    fetcher: async () => new Response(JSON.stringify({ error: 'temporary' }), { status: 503 }),
  }),
  /status 503/,
);

await assert.rejects(
  grantJudgePromotionalEntitlement({
    appUserId: 'recall_judge_unconfirmed',
    expiresAt,
    config: { secretApiKey: 'secret_test', entitlementId: 'pro' },
    fetcher: async () =>
      new Response(JSON.stringify({ subscriber: { entitlements: {} } }), { status: 200 }),
  }),
  /did not confirm/,
);

console.log('RevenueCat judge entitlement provisioning and failure checks passed');
