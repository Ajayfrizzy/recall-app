import { createHash } from 'node:crypto';

type Environment = Record<string, string | undefined>;

export type RevenueCatConfig = {
  secretApiKey: string;
  entitlementId: string;
};

export type RevenueCatProvisioningErrorCode =
  | 'revenuecat_not_configured'
  | 'revenuecat_authentication_failed'
  | 'revenuecat_project_or_entitlement_mismatch'
  | 'revenuecat_grant_rejected'
  | 'revenuecat_invalid_response'
  | 'revenuecat_expiration_mismatch'
  | 'revenuecat_network_timeout'
  | 'revenuecat_network_failure';

type RevenueCatDiagnostic = {
  event: 'judge_provisioning';
  result: 'success' | 'failure';
  code: 'revenuecat_provisioning_succeeded' | RevenueCatProvisioningErrorCode;
  customerRef: string;
  entitlementId: string;
  status?: number;
};

type DiagnosticLogger = (diagnostic: RevenueCatDiagnostic) => void;

export class RevenueCatProvisioningError extends Error {
  constructor(
    readonly code: RevenueCatProvisioningErrorCode,
    readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'RevenueCatProvisioningError';
  }
}

export function getRevenueCatConfig(env: Environment = process.env): RevenueCatConfig {
  return {
    secretApiKey: env.REVENUECAT_SECRET_API_KEY?.trim() ?? '',
    entitlementId: 'pro',
  };
}

function customerReference(appUserId: string): string {
  return createHash('sha256').update(appUserId).digest('hex').slice(0, 12);
}

function defaultLogger(diagnostic: RevenueCatDiagnostic): void {
  const method = diagnostic.result === 'success' ? console.info : console.warn;
  method('[revenuecat-provisioning]', diagnostic);
}

function responseErrorCode(status: number): RevenueCatProvisioningErrorCode {
  if (status === 401 || status === 403) return 'revenuecat_authentication_failed';
  if (status === 404) return 'revenuecat_project_or_entitlement_mismatch';
  return 'revenuecat_grant_rejected';
}

function isAbortError(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (error instanceof Error && error.name === 'AbortError');
}

export async function grantJudgePromotionalEntitlement({
  appUserId,
  expiresAt,
  config = getRevenueCatConfig(),
  fetcher = fetch,
  timeoutMs = 10_000,
  logger = defaultLogger,
}: {
  appUserId: string;
  expiresAt: number;
  config?: RevenueCatConfig;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  logger?: DiagnosticLogger;
}): Promise<void> {
  const diagnostic = {
    event: 'judge_provisioning' as const,
    customerRef: customerReference(appUserId),
    entitlementId: config.entitlementId,
  };
  const fail = (code: RevenueCatProvisioningErrorCode, status?: number, cause?: unknown): never => {
    logger({ ...diagnostic, result: 'failure', code, ...(status ? { status } : {}) });
    throw new RevenueCatProvisioningError(code, status, cause ? { cause } : undefined);
  };

  if (!config.secretApiKey) fail('revenuecat_not_configured');
  if (config.entitlementId !== 'pro') fail('revenuecat_project_or_entitlement_mismatch');

  const url =
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}` +
    `/entitlements/${encodeURIComponent(config.entitlementId)}/promotional`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.secretApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ end_time_ms: expiresAt }),
      signal: controller.signal,
    });
  } catch (error) {
    response = fail(
      isAbortError(error, controller.signal)
        ? 'revenuecat_network_timeout'
        : 'revenuecat_network_failure',
      undefined,
      error,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status !== 201) fail(responseErrorCode(response.status), response.status);

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    fail('revenuecat_invalid_response', response.status, error);
  }
  if (!body || typeof body !== 'object') fail('revenuecat_invalid_response', response.status);
  const value = (body as { value?: unknown }).value;
  if (!value || typeof value !== 'object') fail('revenuecat_invalid_response', response.status);
  const subscriber = (value as { subscriber?: unknown }).subscriber;
  if (!subscriber || typeof subscriber !== 'object') {
    fail('revenuecat_invalid_response', response.status);
  }
  const entitlements = (subscriber as { entitlements?: unknown }).entitlements;
  if (!entitlements || typeof entitlements !== 'object') {
    fail('revenuecat_invalid_response', response.status);
  }
  const entitlement = (entitlements as Record<string, unknown>)[config.entitlementId];
  if (!entitlement || typeof entitlement !== 'object') {
    fail('revenuecat_project_or_entitlement_mismatch', response.status);
  }
  const expiration = (entitlement as { expires_date?: unknown }).expires_date;
  const confirmedExpiration = typeof expiration === 'string' ? Date.parse(expiration) : Number.NaN;
  if (!Number.isFinite(confirmedExpiration)) fail('revenuecat_invalid_response', response.status);
  if (Math.abs(confirmedExpiration - expiresAt) > 1_000) {
    fail('revenuecat_expiration_mismatch', response.status);
  }

  logger({
    ...diagnostic,
    result: 'success',
    code: 'revenuecat_provisioning_succeeded',
    status: response.status,
  });
}
