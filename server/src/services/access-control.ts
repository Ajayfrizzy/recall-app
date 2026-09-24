import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { AccessControlError } from '../errors.js';
import type { RecallAnalysis } from '../schemas/recall-analysis.js';

type Environment = Record<string, string | undefined>;

export type AccessConfig = {
  databasePath: string;
  tokenPepper: string;
  analysisEnabled: boolean;
  installationDailyLimit: number;
  globalDailyLimit: number;
  globalConcurrencyLimit: number;
  tokenTtlDays: number;
  redemptionWindowMinutes: number;
  redemptionMaxFailures: number;
  monthlyEstimatedLimitMicroUsd: number;
  requestReservationMicroUsd: number;
  inputPricePerMillionUsd: number;
  cachedInputPricePerMillionUsd: number;
  outputPricePerMillionUsd: number;
  reservationTtlMs: number;
};

export type ProviderUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
};

type TokenRow = {
  id: string;
  expires_at: number;
  revoked_at: number | null;
};

type InvitationRow = {
  id: string;
  expires_at: number;
  redeemed_at: number | null;
  revoked_at: number | null;
};

type ReservationRow = {
  id: string;
  token_id: string;
  fingerprint: string;
  month_key: string;
  reserved_micro_usd: number;
};

export type AnalysisReservation = {
  kind: 'reserved';
  id: string;
  tokenId: string;
  fingerprint: string;
};

export type CachedAnalysis = { kind: 'cached'; analysis: RecallAnalysis };

function integerEnv(value: string | undefined, fallback: number, minimum = 1): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum ? parsed : fallback;
}

function dollarEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAccessConfig(env: Environment = process.env): AccessConfig {
  const timeoutMs = integerEnv(env.OPENAI_REQUEST_TIMEOUT_MS, 45_000, 5_000);
  return {
    databasePath: resolve(env.RECALL_ACCESS_DB_PATH?.trim() || './data/recall-access.sqlite'),
    tokenPepper: env.RECALL_TOKEN_PEPPER?.trim() || '',
    analysisEnabled: env.AI_ANALYSIS_ENABLED?.trim().toLowerCase() === 'true',
    installationDailyLimit: integerEnv(env.AI_INSTALLATION_DAILY_LIMIT, 10),
    globalDailyLimit: integerEnv(env.AI_GLOBAL_DAILY_LIMIT, 40),
    globalConcurrencyLimit: integerEnv(env.AI_GLOBAL_CONCURRENCY_LIMIT, 2),
    tokenTtlDays: integerEnv(env.AI_ACCESS_TOKEN_TTL_DAYS, 30),
    redemptionWindowMinutes: integerEnv(env.AI_REDEMPTION_WINDOW_MINUTES, 15),
    redemptionMaxFailures: integerEnv(env.AI_REDEMPTION_MAX_FAILURES, 5),
    monthlyEstimatedLimitMicroUsd: Math.floor(
      dollarEnv(env.AI_MONTHLY_ESTIMATED_LIMIT_USD, 1.5) * 1_000_000,
    ),
    requestReservationMicroUsd: Math.floor(
      dollarEnv(env.AI_REQUEST_RESERVATION_USD, 0.05) * 1_000_000,
    ),
    inputPricePerMillionUsd: dollarEnv(env.OPENAI_INPUT_PRICE_PER_MILLION_USD, 0.25),
    cachedInputPricePerMillionUsd: dollarEnv(env.OPENAI_CACHED_INPUT_PRICE_PER_MILLION_USD, 0.025),
    outputPricePerMillionUsd: dollarEnv(env.OPENAI_OUTPUT_PRICE_PER_MILLION_USD, 2),
    reservationTtlMs: timeoutMs + 15_000,
  };
}

function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function utcMonth(now: number): string {
  return new Date(now).toISOString().slice(0, 7);
}

function normalizeInvitation(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

function invitationCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(20);
  const body = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `RCL-${body.match(/.{1,5}/g)?.join('-')}`;
}

export class AnalysisAccessStore {
  private readonly database: DatabaseSync;

  constructor(readonly config: AccessConfig) {
    if (!config.tokenPepper) {
      throw new Error('RECALL_TOKEN_PEPPER is required for access-token hashing.');
    }
    if (config.databasePath !== ':memory:')
      mkdirSync(dirname(config.databasePath), { recursive: true });
    this.database = new DatabaseSync(config.databasePath);
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    if (config.databasePath !== ':memory:') this.database.exec('PRAGMA journal_mode = WAL;');
    this.migrate();
  }

  close(): void {
    this.database.close();
  }

  private migrate(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        redeemed_at INTEGER,
        revoked_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS installation_tokens (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        revoked_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS redemption_failures (
        address_hash TEXT NOT NULL,
        attempted_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS redemption_failures_lookup
        ON redemption_failures(address_hash, attempted_at);
      CREATE TABLE IF NOT EXISTS installation_daily_usage (
        token_id TEXT NOT NULL,
        usage_date TEXT NOT NULL,
        request_count INTEGER NOT NULL,
        PRIMARY KEY(token_id, usage_date),
        FOREIGN KEY(token_id) REFERENCES installation_tokens(id)
      );
      CREATE TABLE IF NOT EXISTS global_daily_usage (
        usage_date TEXT PRIMARY KEY,
        request_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS monthly_estimated_spending (
        month_key TEXT PRIMARY KEY,
        estimated_micro_usd INTEGER NOT NULL,
        reserved_micro_usd INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS active_analysis_requests (
        id TEXT PRIMARY KEY,
        token_id TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        month_key TEXT NOT NULL,
        reserved_micro_usd INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        UNIQUE(token_id, fingerprint),
        FOREIGN KEY(token_id) REFERENCES installation_tokens(id)
      );
      CREATE TABLE IF NOT EXISTS analysis_cache (
        token_id TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        analysis_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY(token_id, fingerprint),
        FOREIGN KEY(token_id) REFERENCES installation_tokens(id)
      );
    `);
  }

  private transaction<T>(operation: () => T): T {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.database.exec('COMMIT');
      return result;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  private hash(namespace: string, value: string): string {
    return createHmac('sha256', this.config.tokenPepper)
      .update(namespace)
      .update('\0')
      .update(value)
      .digest('hex');
  }

  fingerprint(parts: string[]): string {
    return this.hash('analysis', parts.join('\0'));
  }

  createInvitation(now = Date.now(), ttlDays = 7): { code: string; expiresAt: number } {
    const code = invitationCode();
    const expiresAt = now + ttlDays * 86_400_000;
    this.database
      .prepare('INSERT INTO invitations(id, code_hash, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), this.hash('invitation', normalizeInvitation(code)), now, expiresAt);
    return { code, expiresAt };
  }

  redeemInvitation(
    code: string,
    remoteAddress: string | undefined,
    now = Date.now(),
  ): { accessToken: string; expiresAt: number } {
    const result = this.transaction<
      | { ok: true; accessToken: string; expiresAt: number }
      | {
          ok: false;
          code: 'invalid_invitation' | 'invitation_already_redeemed' | 'invitation_expired';
        }
    >(() => {
      const addressHash = this.hash('address', remoteAddress || 'unknown');
      const cutoff = now - this.config.redemptionWindowMinutes * 60_000;
      this.database.prepare('DELETE FROM redemption_failures WHERE attempted_at < ?').run(cutoff);

      const invitation = this.database
        .prepare(
          `SELECT id, expires_at, redeemed_at, revoked_at FROM invitations WHERE code_hash = ?`,
        )
        .get(this.hash('invitation', normalizeInvitation(code))) as InvitationRow | undefined;

      const invitationIsUsable =
        invitation &&
        invitation.redeemed_at === null &&
        invitation.revoked_at === null &&
        invitation.expires_at > now;

      // A valid invitation must not be blocked by failures from other testers on the same NAT IP.
      if (!invitationIsUsable) {
        const failures = this.database
          .prepare(
            'SELECT COUNT(*) AS count FROM redemption_failures WHERE address_hash = ? AND attempted_at >= ?',
          )
          .get(addressHash, cutoff) as { count: number };
        if (failures.count >= this.config.redemptionMaxFailures) {
          throw new AccessControlError('redemption_rate_limited', 429);
        }
        this.database
          .prepare('INSERT INTO redemption_failures(address_hash, attempted_at) VALUES (?, ?)')
          .run(addressHash, now);
        if (invitation?.redeemed_at !== null && invitation?.redeemed_at !== undefined) {
          return { ok: false, code: 'invitation_already_redeemed' };
        }
        if (invitation && invitation.expires_at <= now) {
          return { ok: false, code: 'invitation_expired' };
        }
        return { ok: false, code: 'invalid_invitation' };
      }

      const redeemed = this.database
        .prepare('UPDATE invitations SET redeemed_at = ? WHERE id = ? AND redeemed_at IS NULL')
        .run(now, invitation.id);
      if (redeemed.changes !== 1) {
        return { ok: false, code: 'invitation_already_redeemed' };
      }

      const accessToken = `rcl_at_${randomBytes(32).toString('base64url')}`;
      const expiresAt = now + this.config.tokenTtlDays * 86_400_000;
      this.database
        .prepare(
          `INSERT INTO installation_tokens(id, token_hash, created_at, expires_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(randomUUID(), this.hash('token', accessToken), now, expiresAt);
      return { ok: true, accessToken, expiresAt };
    });
    if (!result.ok) throw new AccessControlError(result.code, 400);
    return { accessToken: result.accessToken, expiresAt: result.expiresAt };
  }

  revokeToken(tokenId: string, now = Date.now()): boolean {
    return (
      this.database
        .prepare(
          'UPDATE installation_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL',
        )
        .run(now, tokenId).changes === 1
    );
  }

  listTokens(): Array<{
    id: string;
    createdAt: number;
    expiresAt: number;
    revokedAt: number | null;
  }> {
    return this.database
      .prepare(
        `SELECT id, created_at AS createdAt, expires_at AS expiresAt, revoked_at AS revokedAt
           FROM installation_tokens ORDER BY created_at DESC`,
      )
      .all() as Array<{
      id: string;
      createdAt: number;
      expiresAt: number;
      revokedAt: number | null;
    }>;
  }

  private tokenFor(rawToken: string | undefined, now: number): TokenRow {
    if (!rawToken) throw new AccessControlError('missing_access_token', 401);
    const token = this.database
      .prepare('SELECT id, expires_at, revoked_at FROM installation_tokens WHERE token_hash = ?')
      .get(this.hash('token', rawToken)) as TokenRow | undefined;
    if (!token) throw new AccessControlError('invalid_access_token', 401);
    if (token.revoked_at !== null) throw new AccessControlError('access_token_revoked', 403);
    if (token.expires_at <= now) throw new AccessControlError('access_token_expired', 403);
    return token;
  }

  private reconcileStaleReservations(now: number): void {
    const stale = this.database
      .prepare('SELECT * FROM active_analysis_requests WHERE expires_at <= ?')
      .all(now) as ReservationRow[];
    const reconcile = this.database.prepare(
      `UPDATE monthly_estimated_spending
       SET reserved_micro_usd = MAX(0, reserved_micro_usd - ?),
           estimated_micro_usd = estimated_micro_usd + ?
       WHERE month_key = ?`,
    );
    for (const reservation of stale) {
      reconcile.run(
        reservation.reserved_micro_usd,
        reservation.reserved_micro_usd,
        reservation.month_key,
      );
    }
    this.database.prepare('DELETE FROM active_analysis_requests WHERE expires_at <= ?').run(now);
  }

  reserveAnalysis(
    rawToken: string | undefined,
    fingerprint: string,
    force: boolean,
    now = Date.now(),
  ): AnalysisReservation | CachedAnalysis {
    if (!this.config.analysisEnabled) throw new AccessControlError('analysis_disabled', 503);
    return this.transaction(() => {
      const token = this.tokenFor(rawToken, now);
      if (!force) {
        const cached = this.database
          .prepare(
            'SELECT analysis_json FROM analysis_cache WHERE token_id = ? AND fingerprint = ?',
          )
          .get(token.id, fingerprint) as { analysis_json: string } | undefined;
        if (cached) return { kind: 'cached', analysis: JSON.parse(cached.analysis_json) };
      }

      this.reconcileStaleReservations(now);
      const duplicate = this.database
        .prepare('SELECT 1 FROM active_analysis_requests WHERE token_id = ? AND fingerprint = ?')
        .get(token.id, fingerprint);
      if (duplicate) throw new AccessControlError('duplicate_analysis_in_progress', 409);

      const active = this.database
        .prepare('SELECT COUNT(*) AS count FROM active_analysis_requests')
        .get() as { count: number };
      if (active.count >= this.config.globalConcurrencyLimit) {
        throw new AccessControlError('analysis_busy', 503);
      }

      const day = utcDay(now);
      const installationUsage = this.database
        .prepare(
          'SELECT request_count FROM installation_daily_usage WHERE token_id = ? AND usage_date = ?',
        )
        .get(token.id, day) as { request_count: number } | undefined;
      if ((installationUsage?.request_count ?? 0) >= this.config.installationDailyLimit) {
        throw new AccessControlError('installation_allowance_exhausted', 429);
      }
      const globalUsage = this.database
        .prepare('SELECT request_count FROM global_daily_usage WHERE usage_date = ?')
        .get(day) as { request_count: number } | undefined;
      if ((globalUsage?.request_count ?? 0) >= this.config.globalDailyLimit) {
        throw new AccessControlError('global_allowance_exhausted', 429);
      }

      const month = utcMonth(now);
      this.database
        .prepare(
          `INSERT INTO monthly_estimated_spending(month_key, estimated_micro_usd, reserved_micro_usd)
           VALUES (?, 0, 0) ON CONFLICT(month_key) DO NOTHING`,
        )
        .run(month);
      const spending = this.database
        .prepare(
          `SELECT estimated_micro_usd, reserved_micro_usd
           FROM monthly_estimated_spending WHERE month_key = ?`,
        )
        .get(month) as { estimated_micro_usd: number; reserved_micro_usd: number };
      if (
        spending.estimated_micro_usd +
          spending.reserved_micro_usd +
          this.config.requestReservationMicroUsd >
        this.config.monthlyEstimatedLimitMicroUsd
      ) {
        throw new AccessControlError('estimated_spending_limit_exhausted', 503);
      }

      this.database
        .prepare(
          `INSERT INTO installation_daily_usage(token_id, usage_date, request_count)
           VALUES (?, ?, 1)
           ON CONFLICT(token_id, usage_date) DO UPDATE SET request_count = request_count + 1`,
        )
        .run(token.id, day);
      this.database
        .prepare(
          `INSERT INTO global_daily_usage(usage_date, request_count) VALUES (?, 1)
           ON CONFLICT(usage_date) DO UPDATE SET request_count = request_count + 1`,
        )
        .run(day);
      this.database
        .prepare(
          `UPDATE monthly_estimated_spending
           SET reserved_micro_usd = reserved_micro_usd + ? WHERE month_key = ?`,
        )
        .run(this.config.requestReservationMicroUsd, month);

      const id = randomUUID();
      this.database
        .prepare(
          `INSERT INTO active_analysis_requests
           (id, token_id, fingerprint, month_key, reserved_micro_usd, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          token.id,
          fingerprint,
          month,
          this.config.requestReservationMicroUsd,
          now + this.config.reservationTtlMs,
        );
      return { kind: 'reserved', id, tokenId: token.id, fingerprint };
    });
  }

  estimateUsageMicroUsd(usage: ProviderUsage): number {
    const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
    const uncached = Math.max(0, usage.inputTokens - cached);
    return Math.ceil(
      uncached * this.config.inputPricePerMillionUsd +
        cached * this.config.cachedInputPricePerMillionUsd +
        usage.outputTokens * this.config.outputPricePerMillionUsd,
    );
  }

  completeAnalysis(
    reservationId: string,
    analysis: RecallAnalysis | undefined,
    usage: ProviderUsage | undefined,
    now = Date.now(),
  ): void {
    this.transaction(() => {
      const reservation = this.database
        .prepare('SELECT * FROM active_analysis_requests WHERE id = ?')
        .get(reservationId) as ReservationRow | undefined;
      if (!reservation) return;
      const estimated = usage ? this.estimateUsageMicroUsd(usage) : reservation.reserved_micro_usd;
      this.database
        .prepare(
          `UPDATE monthly_estimated_spending
           SET reserved_micro_usd = MAX(0, reserved_micro_usd - ?),
               estimated_micro_usd = estimated_micro_usd + ?
           WHERE month_key = ?`,
        )
        .run(reservation.reserved_micro_usd, estimated, reservation.month_key);
      if (analysis) {
        this.database
          .prepare(
            `INSERT INTO analysis_cache(token_id, fingerprint, analysis_json, created_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(token_id, fingerprint) DO UPDATE SET
               analysis_json = excluded.analysis_json, created_at = excluded.created_at`,
          )
          .run(reservation.token_id, reservation.fingerprint, JSON.stringify(analysis), now);
      }
      this.database.prepare('DELETE FROM active_analysis_requests WHERE id = ?').run(reservationId);
    });
  }

  getUsageSnapshot(now = Date.now()): {
    globalDailyCount: number;
    estimatedMicroUsd: number;
    reservedMicroUsd: number;
    activeCount: number;
  } {
    const global = this.database
      .prepare('SELECT request_count FROM global_daily_usage WHERE usage_date = ?')
      .get(utcDay(now)) as { request_count: number } | undefined;
    const spending = this.database
      .prepare(
        'SELECT estimated_micro_usd, reserved_micro_usd FROM monthly_estimated_spending WHERE month_key = ?',
      )
      .get(utcMonth(now)) as
      { estimated_micro_usd: number; reserved_micro_usd: number } | undefined;
    const active = this.database
      .prepare('SELECT COUNT(*) AS count FROM active_analysis_requests')
      .get() as { count: number };
    return {
      globalDailyCount: global?.request_count ?? 0,
      estimatedMicroUsd: spending?.estimated_micro_usd ?? 0,
      reservedMicroUsd: spending?.reserved_micro_usd ?? 0,
      activeCount: active.count,
    };
  }
}

let sharedStore: AnalysisAccessStore | undefined;

export function getAnalysisAccessStore(): AnalysisAccessStore {
  sharedStore ??= new AnalysisAccessStore(getAccessConfig());
  return sharedStore;
}

export function bearerToken(header: string | string[] | undefined): string | undefined {
  const value = Array.isArray(header) ? header[0] : header;
  const match = value?.match(/^Bearer ([A-Za-z0-9_-]+)$/);
  return match?.[1];
}
