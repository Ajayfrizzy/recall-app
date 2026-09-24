import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
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
    standardInvitationTtlDays: 7,
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
  assert.equal(invitation.expiresAt, baseTime + 7 * 86_400_000);
  expectCode(
    () => store.redeemInvitation('not-a-real-code', '10.0.0.1', baseTime),
    'invalid_invitation',
  );
  const spacedLowercaseCode = invitation.code.toLowerCase().replaceAll('-', ' - ');
  const redeemed = store.redeemInvitation(spacedLowercaseCode, '10.0.0.1', baseTime);
  assert.match(redeemed.accessToken, /^rcl_at_[A-Za-z0-9_-]+$/);
  assert.equal(redeemed.invitationType, 'standard');
  assert.equal(redeemed.proProvisioning, undefined, 'standard invitations must not grant Pro');
  expectCode(
    () => store.redeemInvitation(invitation.code, '10.0.0.1', baseTime),
    'invitation_already_redeemed',
  );
  expectCode(() => store.reserveAnalysis(undefined, 'a', false, baseTime), 'missing_access_token');
  expectCode(() => store.reserveAnalysis('invalid', 'a', false, baseTime), 'invalid_access_token');

  const first = store.reserveAnalysis(redeemed.accessToken, 'first', false, baseTime);
  assert.equal(first.kind, 'reserved');
  if (first.kind === 'reserved')
    store.completeAnalysis(first.id, analysis, {
      inputTokens: 1000,
      cachedInputTokens: 200,
      outputTokens: 100,
    });
  const cached = store.reserveAnalysis(redeemed.accessToken, 'first', false, baseTime);
  assert.equal(cached.kind, 'cached', 'a valid saved analysis should be reused');
  const reanalysis = store.reserveAnalysis(redeemed.accessToken, 'first', true, baseTime);
  assert.equal(reanalysis.kind, 'reserved', 'explicit reanalysis must remain available');
  if (reanalysis.kind === 'reserved') store.completeAnalysis(reanalysis.id, analysis, undefined);

  const restartSnapshot = store.getUsageSnapshot(baseTime);
  store.close();

  const judgeStore = new AnalysisAccessStore(config());
  const judgeInvitation = judgeStore.createJudgeInvitation(baseTime);
  assert.equal(judgeInvitation.expiresAt, baseTime + 60 * 86_400_000);
  const judge = judgeStore.redeemInvitation(judgeInvitation.code, '10.0.0.9', baseTime);
  assert.equal(judge.invitationType, 'judge');
  assert.equal(judge.expiresAt, baseTime + 90 * 86_400_000);
  assert.equal(judge.judgeAccessExpiresAt, judge.expiresAt);
  assert.match(judge.revenueCatAppUserId ?? '', /^recall_judge_/);
  assert.equal(judge.proProvisioning, 'pending');
  const pendingJudge = judgeStore.getJudgeProvisioning(judge.accessToken, baseTime);
  assert.equal(pendingJudge.confirmed, false);
  assert.equal(pendingJudge.revenueCatAppUserId, judge.revenueCatAppUserId);
  judgeStore.confirmJudgeProvisioning(pendingJudge.tokenId, baseTime + 1);
  assert.equal(judgeStore.getJudgeProvisioning(judge.accessToken, baseTime).confirmed, true);
  judgeStore.close();

  const revokedInvitationStore = new AnalysisAccessStore(config());
  const revokedJudge = revokedInvitationStore.createJudgeInvitation(baseTime);
  assert(revokedInvitationStore.revokeInvitation(revokedJudge.invitationId, baseTime + 1));
  expectCode(
    () => revokedInvitationStore.redeemInvitation(revokedJudge.code, '10.0.0.10', baseTime + 2),
    'invalid_invitation',
  );
  revokedInvitationStore.close();

  const standardOnlyStore = new AnalysisAccessStore(config());
  const standardOnly = token(standardOnlyStore, baseTime);
  expectCode(
    () => standardOnlyStore.getJudgeProvisioning(standardOnly, baseTime),
    'judge_access_required',
  );
  standardOnlyStore.close();

  const migrationDirectory = mkdtempSync(join(tmpdir(), 'recall-access-migration-'));
  directories.push(migrationDirectory);
  const migrationPath = join(migrationDirectory, 'access.sqlite');
  const legacyDatabase = new DatabaseSync(migrationPath);
  legacyDatabase.exec(`
    CREATE TABLE invitations (
      id TEXT PRIMARY KEY, code_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL, redeemed_at INTEGER, revoked_at INTEGER
    );
    CREATE TABLE installation_tokens (
      id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL, revoked_at INTEGER
    );
    INSERT INTO installation_tokens(id, token_hash, created_at, expires_at, revoked_at)
      VALUES ('legacy-token', 'legacy-hash', ${baseTime}, ${baseTime + 86_400_000}, NULL);
  `);
  legacyDatabase.close();
  const migratedStore = new AnalysisAccessStore({ ...config(), databasePath: migrationPath });
  const migratedToken = migratedStore.listTokens().find((item) => item.id === 'legacy-token');
  assert.equal(migratedToken?.invitationType, 'standard');
  assert.equal(migratedToken?.promotionalProvisionedAt, null);
  migratedStore.close();
  store = new AnalysisAccessStore(baseConfig);
  assert.equal(store.getUsageSnapshot(baseTime).globalDailyCount, restartSnapshot.globalDailyCount);
  assert.equal(
    store.reserveAnalysis(redeemed.accessToken, 'first', false, baseTime).kind,
    'cached',
  );
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

  const expiredInvitationStore = new AnalysisAccessStore(config());
  const expiredInvitation = expiredInvitationStore.createInvitation(baseTime, 1);
  expectCode(
    () =>
      expiredInvitationStore.redeemInvitation(
        expiredInvitation.code,
        '10.0.0.2',
        baseTime + 86_400_001,
      ),
    'invitation_expired',
  );
  expiredInvitationStore.close();

  const quotaStore = new AnalysisAccessStore(
    config({ installationDailyLimit: 2, globalDailyLimit: 3 }),
  );
  const firstToken = token(quotaStore, baseTime);
  for (const fingerprint of ['one', 'two']) {
    const reservation = quotaStore.reserveAnalysis(firstToken, fingerprint, true, baseTime);
    assert.equal(reservation.kind, 'reserved');
    if (reservation.kind === 'reserved')
      quotaStore.completeAnalysis(reservation.id, analysis, undefined);
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

  const globalQuotaStore = new AnalysisAccessStore(
    config({ installationDailyLimit: 10, globalDailyLimit: 1 }),
  );
  const globalFirstToken = token(globalQuotaStore, baseTime);
  const globalSecondToken = token(globalQuotaStore, baseTime);
  const globalReservation = globalQuotaStore.reserveAnalysis(
    globalFirstToken,
    'global-one',
    true,
    baseTime,
  );
  assert.equal(globalReservation.kind, 'reserved');
  if (globalReservation.kind === 'reserved') {
    globalQuotaStore.completeAnalysis(globalReservation.id, analysis, undefined);
  }
  expectCode(
    () => globalQuotaStore.reserveAnalysis(globalSecondToken, 'global-two', true, baseTime),
    'global_allowance_exhausted',
  );
  globalQuotaStore.close();

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
  if (activeOne.kind === 'reserved')
    concurrencyStore.completeAnalysis(activeOne.id, undefined, undefined);
  if (activeTwo.kind === 'reserved')
    concurrencyStore.completeAnalysis(activeTwo.id, undefined, undefined);
  assert.equal(concurrencyStore.getUsageSnapshot(baseTime).activeCount, 0);
  concurrencyStore.close();

  const spendingStore = new AnalysisAccessStore(
    config({ monthlyEstimatedLimitMicroUsd: 100_000, requestReservationMicroUsd: 50_000 }),
  );
  const spendingToken = token(spendingStore, baseTime);
  for (const fingerprint of ['spend-1', 'spend-2']) {
    const reservation = spendingStore.reserveAnalysis(spendingToken, fingerprint, true, baseTime);
    assert.equal(reservation.kind, 'reserved');
    if (reservation.kind === 'reserved')
      spendingStore.completeAnalysis(reservation.id, undefined, undefined);
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

  const judgeSpendingStore = new AnalysisAccessStore(
    config({ monthlyEstimatedLimitMicroUsd: 50_000, requestReservationMicroUsd: 50_000 }),
  );
  const judgeSpendingInvitation = judgeSpendingStore.createJudgeInvitation(baseTime);
  const judgeSpendingToken = judgeSpendingStore.redeemInvitation(
    judgeSpendingInvitation.code,
    '10.0.0.11',
    baseTime,
  ).accessToken;
  const judgeReservation = judgeSpendingStore.reserveAnalysis(
    judgeSpendingToken,
    'judge-spend-1',
    true,
    baseTime,
  );
  assert.equal(judgeReservation.kind, 'reserved');
  if (judgeReservation.kind === 'reserved') {
    judgeSpendingStore.completeAnalysis(judgeReservation.id, undefined, undefined);
  }
  expectCode(
    () => judgeSpendingStore.reserveAnalysis(judgeSpendingToken, 'judge-spend-2', true, baseTime),
    'estimated_spending_limit_exhausted',
  );
  judgeSpendingStore.close();

  const disabledStore = new AnalysisAccessStore(config({ analysisEnabled: false }));
  const disabledToken = token(disabledStore, baseTime);
  expectCode(
    () => disabledStore.reserveAnalysis(disabledToken, 'disabled', false, baseTime),
    'analysis_disabled',
  );
  disabledStore.close();

  const bruteStore = new AnalysisAccessStore(config({ redemptionMaxFailures: 2 }));
  expectCode(
    () => bruteStore.redeemInvitation('bad-1', '203.0.113.1', baseTime),
    'invalid_invitation',
  );
  expectCode(
    () => bruteStore.redeemInvitation('bad-2', '203.0.113.1', baseTime),
    'invalid_invitation',
  );
  expectCode(
    () => bruteStore.redeemInvitation('bad-3', '203.0.113.1', baseTime),
    'redemption_rate_limited',
  );
  const validAfterSharedFailures = bruteStore.createInvitation(baseTime);
  assert.match(
    bruteStore.redeemInvitation(validAfterSharedFailures.code, '203.0.113.1', baseTime).accessToken,
    /^rcl_at_/,
    'a valid invitation must not be blocked by failures sharing its IP address',
  );
  bruteStore.close();

  console.log(
    'Invitation, authorization, quota, concurrency, persistence, and spending checks passed',
  );
} finally {
  for (const directory of directories) rmSync(directory, { recursive: true, force: true });
}
