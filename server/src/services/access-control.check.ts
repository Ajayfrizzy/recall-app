import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccessControlError } from '../errors.js';
import type { RecallAnalysis } from '../schemas/recall-analysis.js';
import { AnalysisAccessStore, type AccessConfig } from './access-control.js';

const directories: string[] = [];
const analysis: RecallAnalysis = {
  category: 'general',
  confidence: 0.8,
  summary: 'Test result.',
  cardinality: 'single',
  items: [{ type: 'general', suggestedAction: null, summary: 'Test result.', confidence: 0.8 }],
  suggestedActions: [],
};

function config(overrides: Partial<AccessConfig> = {}): AccessConfig {
  const directory = mkdtempSync(join(tmpdir(), 'recall-access-'));
  directories.push(directory);
  return {
    databasePath: join(directory, 'access.sqlite'),
    tokenPepper: 'test-pepper-with-enough-entropy',
    analysisEnabled: true,
    installationDailyLimit: 10,
    globalDailyLimit: 40,
    globalConcurrencyLimit: 2,
    tokenTtlDays: 30,
    redemptionWindowMinutes: 15,
    redemptionMaxFailures: 5,
    monthlyEstimatedLimitMicroUsd: 1_500_000,
    requestReservationMicroUsd: 50_000,
    inputPricePerMillionUsd: 0.25,
    cachedInputPricePerMillionUsd: 0.025,
    outputPricePerMillionUsd: 2,
    reservationTtlMs: 60_000,
    ...overrides,
  };
}

function expectCode(operation: () => unknown, code: string): void {
  assert.throws(operation, (error) => error instanceof AccessControlError && error.code === code);
}

function token(store: AnalysisAccessStore, now = Date.UTC(2026, 8, 23)): string {
  const invitation = store.createInvitation(now);
  return store.redeemInvitation(invitation.code, '127.0.0.1', now).accessToken;
}

try {
  const baseTime = Date.UTC(2026, 8, 23, 23, 59);
  const baseConfig = config();
  let store = new AnalysisAccessStore(baseConfig);
  const invitation = store.createInvitation(baseTime);
  expectCode(() => store.redeemInvitation('not-a-real-code', '10.0.0.1', baseTime), 'invalid_invitation');
  const redeemed = store.redeemInvitation(invitation.code, '10.0.0.1', baseTime);
  assert.match(redeemed.accessToken, /^rcl_at_[A-Za-z0-9_-]+$/);
  expectCode(() => store.redeemInvitation(invitation.code, '10.0.0.1', baseTime), 'invalid_invitation');
  expectCode(() => store.reserveAnalysis(undefined, 'a', false, baseTime), 'missing_access_token');
  expectCode(() => store.reserveAnalysis('invalid', 'a', false, baseTime), 'invalid_access_token');

  const first = store.reserveAnalysis(redeemed.accessToken, 'first', false, baseTime);
  assert.equal(first.kind, 'reserved');
  if (first.kind === 'reserved') store.completeAnalysis(first.id, analysis, { inputTokens: 1000, cachedInputTokens: 200, outputTokens: 100 });
  const cached = store.reserveAnalysis(redeemed.accessToken, 'first', false, baseTime);
  assert.equal(cached.kind, 'cached', 'a valid saved analysis should be reused');
  const reanalysis = store.reserveAnalysis(redeemed.accessToken, 'first', true, baseTime);
  assert.equal(reanalysis.kind, 'reserved', 'explicit reanalysis must remain available');
  if (reanalysis.kind === 'reserved') store.completeAnalysis(reanalysis.id, analysis, undefined);

  const restartSnapshot = store.getUsageSnapshot(baseTime);
  store.close();
  store = new AnalysisAccessStore(baseConfig);
  assert.equal(store.getUsageSnapshot(baseTime).globalDailyCount, restartSnapshot.globalDailyCount);
  assert.equal(store.reserveAnalysis(redeemed.accessToken, 'first', false, baseTime).kind, 'cached');
  const tokenId = store.listTokens()[0]?.id;
  assert(tokenId && store.revokeToken(tokenId, baseTime));
  expectCode(
    () => store.reserveAnalysis(redeemed.accessToken, 'revoked', false, baseTime),
    'access_token_revoked',
  );
  store.close();

  const expiryStore = new AnalysisAccessStore(config({ tokenTtlDays: 1 }));
  const expiringToken = token(expiryStore, baseTime);
  expectCode(
    () => expiryStore.reserveAnalysis(expiringToken, 'expired', false, baseTime + 86_400_001),
    'access_token_expired',
  );
  expiryStore.close();

  const quotaStore = new AnalysisAccessStore(
    config({ installationDailyLimit: 2, globalDailyLimit: 3 }),
  );
  const firstToken = token(quotaStore, baseTime);
  for (const fingerprint of ['one', 'two']) {
    const reservation = quotaStore.reserveAnalysis(firstToken, fingerprint, true, baseTime);
    assert.equal(reservation.kind, 'reserved');
    if (reservation.kind === 'reserved') quotaStore.completeAnalysis(reservation.id, analysis, undefined);
  }
  expectCode(
    () => quotaStore.reserveAnalysis(firstToken, 'three', true, baseTime),
    'installation_allowance_exhausted',
  );
  const nextUtcDay = baseTime + 120_000;
  const reset = quotaStore.reserveAnalysis(firstToken, 'utc-reset', true, nextUtcDay);
  assert.equal(reset.kind, 'reserved', 'quota should reset at the next UTC date');
  if (reset.kind === 'reserved') quotaStore.completeAnalysis(reset.id, analysis, undefined);
  quotaStore.close();

  const concurrencyStore = new AnalysisAccessStore(config({ globalConcurrencyLimit: 2 }));
  const concurrentToken = token(concurrencyStore, baseTime);
  const activeOne = concurrencyStore.reserveAnalysis(concurrentToken, 'active-1', true, baseTime);
  const activeTwo = concurrencyStore.reserveAnalysis(concurrentToken, 'active-2', true, baseTime);
  assert.equal(activeOne.kind, 'reserved');
  assert.equal(activeTwo.kind, 'reserved');
  expectCode(
    () => concurrencyStore.reserveAnalysis(concurrentToken, 'active-3', true, baseTime),
    'analysis_busy',
  );
  expectCode(
    () => concurrencyStore.reserveAnalysis(concurrentToken, 'active-1', true, baseTime),
    'duplicate_analysis_in_progress',
  );
  if (activeOne.kind === 'reserved') concurrencyStore.completeAnalysis(activeOne.id, undefined, undefined);
  if (activeTwo.kind === 'reserved') concurrencyStore.completeAnalysis(activeTwo.id, undefined, undefined);
  assert.equal(concurrencyStore.getUsageSnapshot(baseTime).activeCount, 0);
  concurrencyStore.close();

  const spendingStore = new AnalysisAccessStore(
    config({ monthlyEstimatedLimitMicroUsd: 100_000, requestReservationMicroUsd: 50_000 }),
  );
  const spendingToken = token(spendingStore, baseTime);
  for (const fingerprint of ['spend-1', 'spend-2']) {
    const reservation = spendingStore.reserveAnalysis(spendingToken, fingerprint, true, baseTime);
    assert.equal(reservation.kind, 'reserved');
    if (reservation.kind === 'reserved') spendingStore.completeAnalysis(reservation.id, undefined, undefined);
  }
  expectCode(
    () => spendingStore.reserveAnalysis(spendingToken, 'spend-3', true, baseTime),
    'estimated_spending_limit_exhausted',
  );
  assert.equal(
    spendingStore.estimateUsageMicroUsd({
      inputTokens: 1000,
      cachedInputTokens: 200,
      outputTokens: 100,
    }),
    405,
  );
  spendingStore.close();

  const disabledStore = new AnalysisAccessStore(config({ analysisEnabled: false }));
  const disabledToken = token(disabledStore, baseTime);
  expectCode(
    () => disabledStore.reserveAnalysis(disabledToken, 'disabled', false, baseTime),
    'analysis_disabled',
  );
  disabledStore.close();

  const bruteStore = new AnalysisAccessStore(config({ redemptionMaxFailures: 2 }));
  expectCode(() => bruteStore.redeemInvitation('bad-1', '203.0.113.1', baseTime), 'invalid_invitation');
  expectCode(() => bruteStore.redeemInvitation('bad-2', '203.0.113.1', baseTime), 'invalid_invitation');
  expectCode(
    () => bruteStore.redeemInvitation('bad-3', '203.0.113.1', baseTime),
    'redemption_rate_limited',
  );
  bruteStore.close();

  console.log('Invitation, authorization, quota, concurrency, persistence, and spending checks passed');
} finally {
  for (const directory of directories) rmSync(directory, { recursive: true, force: true });
}
