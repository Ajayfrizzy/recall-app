import assert from 'node:assert/strict';
import {
  classifyRevenueCatError,
  grantJudgePromotionalEntitlement,
  RevenueCatProvisioningError,
  type RevenueCatProvisioningErrorCode,
} from './revenuecat.js';

const expiresAt = Date.UTC(2026, 11, 23);
const now = () => Date.UTC(2026, 8, 24);
const config = { secretApiKey: 'secret_test', entitlementId: 'pro' };
const customerUrl = 'https://api.revenuecat.com/v1/subscribers/recall_judge_stable-id';
const grantUrl = `${customerUrl}/entitlements/pro/promotional`;

function customerInfo({
  expiration = expiresAt,
  wrapped = false,
  entitlement = true,
}: {
  expiration?: number;
  wrapped?: boolean;
  entitlement?: boolean;
} = {}): unknown {
  const value = {
    subscriber: {
      entitlements: entitlement
        ? { pro: { expires_date: new Date(expiration).toISOString() } }
        : {},
    },
  };
  return wrapped ? { value } : value;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function sequenceFetcher(
  steps: Array<{
    method: 'GET' | 'POST';
    url: string;
    response: () => Response | Promise<Response>;
  }>,
): typeof fetch {
  return async (input, init) => {
    const step = steps.shift();
    assert(step, `unexpected ${init?.method ?? 'GET'} request to ${String(input)}`);
    assert.equal(init?.method, step.method);
    assert.equal(input, step.url);
    assert.equal((init?.headers as Record<string, string>).authorization, 'Bearer secret_test');
    if (step.method === 'POST') {
      assert.deepEqual(JSON.parse(String(init?.body)), { end_time_ms: expiresAt });
    }
    return step.response();
  };
}

async function provision(
  fetcher: typeof fetch,
  logger: Parameters<typeof grantJudgePromotionalEntitlement>[0]['logger'] = () => undefined,
): Promise<void> {
  await grantJudgePromotionalEntitlement({
    appUserId: 'recall_judge_stable-id',
    expiresAt,
    config,
    fetcher,
    timeoutMs: 5,
    logger,
    now,
  });
}

async function expectCode(
  code: RevenueCatProvisioningErrorCode,
  fetcher: typeof fetch,
  overrides: Partial<typeof config> = {},
): Promise<void> {
  await assert.rejects(
    grantJudgePromotionalEntitlement({
      appUserId: 'recall_judge_stable-id',
      expiresAt,
      config: { ...config, ...overrides },
      fetcher,
      timeoutMs: 5,
      logger: () => undefined,
      now,
    }),
    (error) => error instanceof RevenueCatProvisioningError && error.code === code,
  );
}

// A normal 201 grant accepts the actual top-level Customer Info response and does not require
// optional subscriber fields.
const diagnostics: Array<{
  code: string;
  customerRef: string;
  operation?: string;
  stage: string;
}> = [];
await provision(
  sequenceFetcher([
    {
      method: 'GET',
      url: customerUrl,
      response: () => jsonResponse(customerInfo({ entitlement: false }), 200),
    },
    {
      method: 'POST',
      url: grantUrl,
      response: () => jsonResponse(customerInfo(), 201),
    },
  ]),
  (diagnostic) => diagnostics.push(diagnostic),
);
assert(
  diagnostics.some(
    ({ operation, stage }) => operation === 'promotional_grant' && stage === 'complete',
  ),
);
assert.notEqual(
  diagnostics[0]?.customerRef,
  'recall_judge_stable-id',
  'diagnostics exposed the complete customer identifier',
);

// RevenueCat's documented wrapped mutating response is accepted too.
await provision(
  sequenceFetcher([
    {
      method: 'GET',
      url: customerUrl,
      response: () => jsonResponse(customerInfo({ entitlement: false }), 200),
    },
    {
      method: 'POST',
      url: grantUrl,
      response: () => jsonResponse(customerInfo({ wrapped: true }), 201),
    },
  ]),
);

// A previously successful grant is detected before POST, preserving its original expiration.
let alreadyGrantedRequests = 0;
await provision(async (input, init) => {
  alreadyGrantedRequests += 1;
  assert.equal(init?.method, 'GET');
  assert.equal(input, customerUrl);
  return jsonResponse(customerInfo(), 200);
});
assert.equal(alreadyGrantedRequests, 1, 'retrying an active grant issued another promotional POST');

// A sparse or invalid 201 response is not blindly accepted; a fresh lookup must verify it.
await provision(
  sequenceFetcher([
    {
      method: 'GET',
      url: customerUrl,
      response: () => jsonResponse(customerInfo({ entitlement: false }), 200),
    },
    {
      method: 'POST',
      url: grantUrl,
      response: () => new Response('{invalid', { status: 201 }),
    },
    {
      method: 'GET',
      url: customerUrl,
      response: () => jsonResponse(customerInfo(), 200),
    },
  ]),
);

await expectCode(
  'revenuecat_entitlement_not_found',
  sequenceFetcher([
    {
      method: 'GET',
      url: customerUrl,
      response: () => jsonResponse(customerInfo({ entitlement: false }), 200),
    },
    {
      method: 'POST',
      url: grantUrl,
      response: () => jsonResponse(customerInfo({ entitlement: false }), 201),
    },
    {
      method: 'GET',
      url: customerUrl,
      response: () => jsonResponse(customerInfo({ entitlement: false }), 200),
    },
  ]),
);

await expectCode(
  'revenuecat_expiration_mismatch',
  sequenceFetcher([
    {
      method: 'GET',
      url: customerUrl,
      response: () => jsonResponse(customerInfo({ entitlement: false }), 200),
    },
    {
      method: 'POST',
      url: grantUrl,
      response: () => jsonResponse(customerInfo({ expiration: expiresAt - 60_000 }), 201),
    },
    {
      method: 'GET',
      url: customerUrl,
      response: () => jsonResponse(customerInfo({ expiration: expiresAt - 60_000 }), 200),
    },
  ]),
);

await expectCode(
  'revenuecat_invalid_response',
  async () => new Response('{invalid', { status: 200 }),
);
await expectCode('revenuecat_not_configured', async () => jsonResponse({}, 200), {
  secretApiKey: '',
});
await expectCode(
  'revenuecat_authentication_failed',
  async () => new Response('{}', { status: 401 }),
);
await expectCode('revenuecat_resource_not_found', async () => new Response('{}', { status: 404 }));
await expectCode('revenuecat_customer_not_found', async () =>
  jsonResponse({ code: 7225, message: 'Subscriber does not exist' }, 404),
);
await expectCode('revenuecat_entitlement_not_found', async () =>
  jsonResponse({ message: 'Entitlement not found' }, 404),
);
await expectCode('revenuecat_project_or_api_key_mismatch', async () =>
  jsonResponse({ message: 'API key belongs to a different project' }, 404),
);
await expectCode('revenuecat_unsupported_operation', async () =>
  jsonResponse({ message: 'Method not allowed' }, 405),
);
await expectCode('revenuecat_grant_rejected', async () => new Response('{}', { status: 422 }));
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

assert.equal(
  classifyRevenueCatError(404, { message: 'Not Found' }),
  'revenuecat_resource_not_found',
  'an ambiguous 404 must not be reported as a project or entitlement mismatch',
);

console.log('RevenueCat judge provisioning validation, lookup, and diagnostic checks passed');
