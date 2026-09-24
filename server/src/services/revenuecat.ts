import { createHash } from 'node:crypto';

type Environment = Record<string, string | undefined>;

export type RevenueCatConfig = {
  secretApiKey: string;
  entitlementId: string;
};

export type RevenueCatProvisioningErrorCode =
  | 'revenuecat_not_configured'
  | 'revenuecat_authentication_failed'
  | 'revenuecat_customer_not_found'
  | 'revenuecat_entitlement_not_found'
  | 'revenuecat_project_or_api_key_mismatch'
  | 'revenuecat_project_or_entitlement_mismatch'
  | 'revenuecat_resource_not_found'
  | 'revenuecat_unsupported_operation'
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
  providerCode?: string;
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

type RevenueCatErrorFields = { code?: string; message?: string };

function safeErrorField(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 300) : undefined;
}

function safeProviderCode(value: string | undefined): string | undefined {
  return value && /^[A-Za-z0-9_.-]{1,64}$/.test(value) ? value : undefined;
}

export function revenueCatErrorFields(body: unknown): RevenueCatErrorFields {
  if (!body || typeof body !== 'object') return {};
  const candidate = body as { code?: unknown; message?: unknown; error?: unknown };
  const nested =
    candidate.error && typeof candidate.error === 'object'
      ? (candidate.error as { code?: unknown; message?: unknown })
      : undefined;
  return {
    code: safeErrorField(candidate.code) ?? safeErrorField(nested?.code),
    message:
      safeErrorField(candidate.message) ??
      safeErrorField(nested?.message) ??
      safeErrorField(candidate.error),
  };
}

export function classifyRevenueCatError(
  status: number,
  fields: RevenueCatErrorFields,
): RevenueCatProvisioningErrorCode {
  const detail = `${fields.code ?? ''} ${fields.message ?? ''}`.toLowerCase();
  if (
    status === 401 ||
    status === 403 ||
    /(?:invalid|missing|unauthorized|forbidden).{0,24}(?:api[ _-]?key|authentication|token)/.test(
      detail,
    )
  ) {
    return 'revenuecat_authentication_failed';
  }
  if (status === 405 || /method not allowed|unsupported (?:method|operation)/.test(detail)) {
    return 'revenuecat_unsupported_operation';
  }
  if (
    /\b(?:customer|subscriber)\b.{0,40}\b(?:not found|does not exist|unknown)\b/.test(detail) ||
    /\b(?:could not|couldn't|cannot) find\b.{0,40}\b(?:customer|subscriber)\b/.test(detail)
  ) {
    return 'revenuecat_customer_not_found';
  }
  if (
    /\bentitlement\b.{0,40}\b(?:not found|does not exist|unknown|invalid)\b/.test(detail) ||
    /\b(?:could not|couldn't|cannot) find\b.{0,40}\bentitlement\b/.test(detail)
  ) {
    return 'revenuecat_entitlement_not_found';
  }
  if (
    /\bproject\b.{0,40}\b(?:not found|does not exist|mismatch|wrong|invalid)\b/.test(detail) ||
    /api[ _-]?key.{0,40}\b(?:different|wrong|mismatched)\b.{0,24}\b(?:project|app)\b/.test(
      detail,
    ) ||
    /api[ _-]?key.{0,40}\b(?:project|app)\b.{0,24}\b(?:mismatch|wrong|different)\b/.test(detail)
  ) {
    return 'revenuecat_project_or_api_key_mismatch';
  }
  if (status === 404) return 'revenuecat_resource_not_found';
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
  const fail = (
    code: RevenueCatProvisioningErrorCode,
    status?: number,
    cause?: unknown,
    providerCode?: string,
  ): never => {
    logger({
      ...diagnostic,
      result: 'failure',
      code,
      ...(status ? { status } : {}),
      ...(providerCode ? { providerCode } : {}),
    });
    throw new RevenueCatProvisioningError(code, status, cause ? { cause } : undefined);
  };

  if (!config.secretApiKey) fail('revenuecat_not_configured');
  if (config.entitlementId !== 'pro') fail('revenuecat_entitlement_not_found');

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

  if (response.status !== 201) {
    let fields: RevenueCatErrorFields = {};
    try {
      fields = revenueCatErrorFields(await response.json());
    } catch {
      // The HTTP status still provides a safe fallback classification.
    }
    fail(
      classifyRevenueCatError(response.status, fields),
      response.status,
      undefined,
      safeProviderCode(fields.code),
    );
  }

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
    fail('revenuecat_entitlement_not_found', response.status);
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
