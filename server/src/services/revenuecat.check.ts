import assert from 'node:assert/strict';
import {
  grantJudgePromotionalEntitlement,
  RevenueCatProvisioningError,
  type RevenueCatProvisioningErrorCode,
} from './revenuecat.js';

const expiresAt = Date.UTC(2026, 11, 23);
const config = { secretApiKey: 'secret_test', entitlementId: 'pro' };

function successResponse(expiration = expiresAt): Response {
  return new Response(
    JSON.stringify({
      value: {
        subscriber: {
          entitlements: { pro: { expires_date: new Date(expiration).toISOString() } },
        },
      },
    }),
    { status: 201, headers: { 'content-type': 'application/json' } },
  );
}

async function expectCode(
  code: RevenueCatProvisioningErrorCode,
  fetcher: typeof fetch,
  overrides: Partial<typeof config> = {},
): Promise<void> {
  await assert.rejects(
    grantJudgePromotionalEntitlement({
      appUserId: 'recall_judge_error-case',
      expiresAt,
      config: { ...config, ...overrides },
      fetcher,
      timeoutMs: 5,
      logger: () => undefined,
    }),
    (error) => error instanceof RevenueCatProvisioningError && error.code === code,
  );
}

const diagnostics: Array<{ code: string; customerRef: string }> = [];
let requestCount = 0;
await grantJudgePromotionalEntitlement({
  appUserId: 'recall_judge_stable-id',
  expiresAt,
  config,
  logger: (diagnostic) => diagnostics.push(diagnostic),
  fetcher: async (input, init) => {
    requestCount += 1;
    assert.equal(
      input,
      'https://api.revenuecat.com/v1/subscribers/recall_judge_stable-id/entitlements/pro/promotional',
    );
    assert.equal((init?.headers as Record<string, string>).authorization, 'Bearer secret_test');
    assert.deepEqual(JSON.parse(String(init?.body)), { end_time_ms: expiresAt });
    return successResponse();
  },
});
assert.equal(requestCount, 1);
assert.equal(diagnostics[0]?.code, 'revenuecat_provisioning_succeeded');
assert.notEqual(
  diagnostics[0]?.customerRef,
  'recall_judge_stable-id',
  'diagnostics exposed the complete customer identifier',
);

await expectCode('revenuecat_not_configured', async () => successResponse(), {
  secretApiKey: '',
});
await expectCode(
  'revenuecat_authentication_failed',
  async () => new Response('{}', { status: 401 }),
);
await expectCode(
  'revenuecat_project_or_entitlement_mismatch',
  async () => new Response('{}', { status: 404 }),
);
await expectCode('revenuecat_grant_rejected', async () => new Response('{}', { status: 422 }));
await expectCode(
  'revenuecat_invalid_response',
  async () => new Response('{invalid', { status: 201 }),
);
await expectCode(
  'revenuecat_project_or_entitlement_mismatch',
  async () =>
    new Response(JSON.stringify({ value: { subscriber: { entitlements: {} } } }), {
      status: 201,
    }),
);
await expectCode('revenuecat_expiration_mismatch', async () => successResponse(expiresAt - 60_000));
await expectCode('revenuecat_network_failure', async () => {
  throw new Error('offline');
});
await expectCode(
  'revenuecat_network_timeout',
  async (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }),
);

console.log('RevenueCat judge provisioning success and diagnostic failure checks passed');
