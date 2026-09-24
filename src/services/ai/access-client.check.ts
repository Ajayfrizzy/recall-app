import assert from 'node:assert/strict';
import {
  AiAccessError,
  createAiAccessClient,
  resolveAnalysisApiUrl,
  type AiAccessStorage,
} from './access-client';
import { authorizedAnalysisHeaders, shouldRequestSemanticAnalysis } from './analysis-policy';

function memoryStorage(initial: string | null = null): AiAccessStorage & { value: string | null } {
  return {
    value: initial,
    async get() {
      return this.value;
    },
    async set(value) {
      this.value = value;
    },
    async remove() {
      this.value = null;
    },
  };
}

async function run(): Promise<void> {
  const now = Date.UTC(2026, 8, 23);
  const credentials = { accessToken: `rcl_at_${'a'.repeat(32)}`, expiresAt: now + 60_000 };
  const storage = memoryStorage();
  let fetchCount = 0;
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  const client = createAiAccessClient({
    storage,
    now: () => now,
    getBaseUrl: () => 'https://api.recall.test',
    fetcher: async (_url, request) => {
      fetchCount += 1;
      assert.equal(request?.method, 'POST');
      assert.deepEqual(request?.headers, { 'content-type': 'application/json' });
      await responseGate;
      return new Response(JSON.stringify(credentials), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  const firstActivation = client.redeem('INVITATION');
  const repeatedActivation = client.redeem('INVITATION');
  releaseResponse();
  assert.deepEqual(await firstActivation, credentials);
  assert.deepEqual(await repeatedActivation, credentials);
  assert.equal(fetchCount, 1, 'repeated activation taps must share one request');
  assert.deepEqual((await client.load()).credentials, credentials, 'token must persist securely');

  const expiredStorage = memoryStorage(JSON.stringify({ ...credentials, expiresAt: now - 1 }));
  const expiredClient = createAiAccessClient({
    storage: expiredStorage,
    now: () => now,
    getBaseUrl: () => 'https://api.recall.test',
  });
  assert.deepEqual(await expiredClient.load(), { credentials: null, expired: true });
  assert.equal(expiredStorage.value, null, 'expired token must be cleared');

  for (const serverCode of [
    'invalid_invitation',
    'invitation_already_redeemed',
    'invitation_expired',
  ] as const) {
    const failingClient = createAiAccessClient({
      storage: memoryStorage(),
      getBaseUrl: () => 'https://api.recall.test',
      fetcher: async () => new Response(JSON.stringify({ error: serverCode }), { status: 400 }),
    });
    await assert.rejects(
      failingClient.redeem('BAD-CODE'),
      (error) => error instanceof AiAccessError && error.code === serverCode,
    );
  }

  const networkClient = createAiAccessClient({
    storage: memoryStorage(),
    getBaseUrl: () => 'https://api.recall.test',
    fetcher: async () => {
      throw new Error('offline');
    },
  });
  await assert.rejects(
    networkClient.redeem('CODE'),
    (error) => error instanceof AiAccessError && error.code === 'backend_unavailable',
  );

  const timeoutClient = createAiAccessClient({
    storage: memoryStorage(),
    getBaseUrl: () => 'https://api.recall.test',
    timeoutMs: 1,
    fetcher: async (_url, request) =>
      new Promise<Response>((_resolve, reject) => {
        request?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }),
  });
  await assert.rejects(
    timeoutClient.redeem('CODE'),
    (error) => error instanceof AiAccessError && error.code === 'network_timeout',
  );

  const malformedClient = createAiAccessClient({
    storage: memoryStorage(),
    getBaseUrl: () => 'https://api.recall.test',
    fetcher: async () => new Response('{not-json', { status: 200 }),
  });
  await assert.rejects(
    malformedClient.redeem('CODE'),
    (error) => error instanceof AiAccessError && error.code === 'malformed_response',
  );

  assert.equal(resolveAnalysisApiUrl('https://api.recall.test/', false), 'https://api.recall.test');
  assert.throws(() => resolveAnalysisApiUrl('http://api.recall.test', false), AiAccessError);
  assert.equal(resolveAnalysisApiUrl('http://10.0.2.2:8787', true), 'http://10.0.2.2:8787');

  assert.deepEqual(authorizedAnalysisHeaders(credentials.accessToken), {
    'content-type': 'application/json',
    authorization: `Bearer ${credentials.accessToken}`,
  });
  assert.equal(
    shouldRequestSemanticAnalysis({ acknowledged: true, accessToken: null }),
    false,
    'missing access must use on-device analysis without a request',
  );
  assert.equal(
    shouldRequestSemanticAnalysis({
      acknowledged: true,
      accessToken: credentials.accessToken,
      useAi: false,
    }),
    false,
    'the explicit on-device path must not request AI',
  );
  assert.equal(
    shouldRequestSemanticAnalysis({ acknowledged: true, accessToken: credentials.accessToken }),
    true,
  );

  console.log('AI access activation, persistence, authorization, and fallback checks passed');
}

void run();
