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

type RevenueCatOperation = 'preflight_lookup' | 'promotional_grant' | 'verification_lookup';
type RevenueCatStage =
  | 'configuration'
  | 'response_status'
  | 'json_parsing'
  | 'response_envelope'
  | 'subscriber_record'
  | 'entitlement_lookup'
  | 'expiration_parsing'
  | 'expiration_verification'
  | 'complete';

type RevenueCatDiagnostic = {
  event: 'judge_provisioning';
  result: 'success' | 'failure' | 'fallback';
  code: 'revenuecat_provisioning_succeeded' | RevenueCatProvisioningErrorCode;
  customerRef: string;
  entitlementId: string;
  operation?: RevenueCatOperation;
  stage: RevenueCatStage;
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

type Inspection =
  | { confirmed: true }
  | {
      confirmed: false;
      code:
        | 'revenuecat_invalid_response'
        | 'revenuecat_entitlement_not_found'
        | 'revenuecat_expiration_mismatch';
      stage: Exclude<
        RevenueCatStage,
        'configuration' | 'response_status' | 'json_parsing' | 'complete'
      >;
    };

function inspectCustomerInfo(
  body: unknown,
  entitlementId: string,
  expiresAt: number,
  now: number,
  onStage: (stage: RevenueCatStage) => void,
): Inspection {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { confirmed: false, code: 'revenuecat_invalid_response', stage: 'response_envelope' };
  }

  // Customer lookups return top-level Customer Info. RevenueCat also documents a wrapped
  // mutating response, so accept either shape without requiring unrelated optional fields.
  const wrapped = (body as { value?: unknown }).value;
  const envelope =
    wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped) ? wrapped : body;
  onStage('response_envelope');
  const subscriber = (envelope as { subscriber?: unknown }).subscriber;
  if (!subscriber || typeof subscriber !== 'object' || Array.isArray(subscriber)) {
    return { confirmed: false, code: 'revenuecat_invalid_response', stage: 'subscriber_record' };
  }
  onStage('subscriber_record');
  const entitlements = (subscriber as { entitlements?: unknown }).entitlements;
  if (!entitlements || typeof entitlements !== 'object' || Array.isArray(entitlements)) {
    return { confirmed: false, code: 'revenuecat_invalid_response', stage: 'entitlement_lookup' };
  }
  const entitlement = (entitlements as Record<string, unknown>)[entitlementId];
  if (!entitlement || typeof entitlement !== 'object' || Array.isArray(entitlement)) {
    return {
      confirmed: false,
      code: 'revenuecat_entitlement_not_found',
      stage: 'entitlement_lookup',
    };
  }
  onStage('entitlement_lookup');
  const expiration = (entitlement as { expires_date?: unknown }).expires_date;
  const confirmedExpiration = typeof expiration === 'string' ? Date.parse(expiration) : Number.NaN;
  if (!Number.isFinite(confirmedExpiration)) {
    return { confirmed: false, code: 'revenuecat_invalid_response', stage: 'expiration_parsing' };
  }
  onStage('expiration_parsing');
  if (confirmedExpiration <= now || Math.abs(confirmedExpiration - expiresAt) > 1_000) {
    return {
      confirmed: false,
      code: 'revenuecat_expiration_mismatch',
      stage: 'expiration_verification',
    };
  }
  onStage('expiration_verification');
  return { confirmed: true };
}

export async function grantJudgePromotionalEntitlement({
  appUserId,
  expiresAt,
  config = getRevenueCatConfig(),
  fetcher = fetch,
  timeoutMs = 10_000,
  logger = defaultLogger,
  now = Date.now,
}: {
  appUserId: string;
  expiresAt: number;
  config?: RevenueCatConfig;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  logger?: DiagnosticLogger;
  now?: () => number;
}): Promise<void> {
  const diagnostic = {
    event: 'judge_provisioning' as const,
    customerRef: customerReference(appUserId),
    entitlementId: config.entitlementId,
  };
  let operation: RevenueCatOperation = 'preflight_lookup';
  let stage: RevenueCatStage = 'configuration';
  const log = (
    result: RevenueCatDiagnostic['result'],
    code: RevenueCatDiagnostic['code'],
    status?: number,
    providerCode?: string,
  ) =>
    logger({
      ...diagnostic,
      result,
      code,
      operation,
      stage,
      ...(status !== undefined ? { status } : {}),
      ...(providerCode ? { providerCode } : {}),
    });
  const fail = (
    code: RevenueCatProvisioningErrorCode,
    status?: number,
    cause?: unknown,
    providerCode?: string,
  ): never => {
    log('failure', code, status, providerCode);
    throw new RevenueCatProvisioningError(code, status, cause ? { cause } : undefined);
  };
  const pass = (nextStage: RevenueCatStage, status?: number): void => {
    stage = nextStage;
    log('success', 'revenuecat_provisioning_succeeded', status);
  };

  if (!config.secretApiKey) fail('revenuecat_not_configured');
  if (config.entitlementId !== 'pro') fail('revenuecat_entitlement_not_found');
  const customerUrl = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`;
  const grantUrl = `${customerUrl}/entitlements/${encodeURIComponent(config.entitlementId)}/promotional`;
  const headers = { authorization: `Bearer ${config.secretApiKey}` };

  const request = async (url: string, init: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetcher(url, { ...init, signal: controller.signal });
    } catch (error) {
      return fail(
        isAbortError(error, controller.signal)
          ? 'revenuecat_network_timeout'
          : 'revenuecat_network_failure',
        undefined,
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  };

  const parseResponse = async (
    response: Response,
    allowFallback: boolean,
  ): Promise<Inspection | undefined> => {
    stage = 'json_parsing';
    let body: unknown;
    try {
      body = await response.json();
      pass('json_parsing', response.status);
    } catch (error) {
      if (allowFallback) {
        log('fallback', 'revenuecat_invalid_response', response.status);
        return undefined;
      }
      fail('revenuecat_invalid_response', response.status, error);
    }
    const inspected = inspectCustomerInfo(body, config.entitlementId, expiresAt, now(), (next) =>
      pass(next, response.status),
    );
    if (!inspected.confirmed) {
      stage = inspected.stage;
      if (allowFallback) {
        log('fallback', inspected.code, response.status);
        return inspected;
      }
      return inspected;
    }
    return inspected;
  };

  const requireSuccessfulStatus = async (
    response: Response,
    expected: readonly number[],
  ): Promise<void> => {
    stage = 'response_status';
    if (expected.includes(response.status)) {
      pass('response_status', response.status);
      return;
    }
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
  };

  const lookup = async (): Promise<Inspection> => {
    const response = await request(customerUrl, { method: 'GET', headers });
    await requireSuccessfulStatus(response, [200, 201]);
    const inspected = await parseResponse(response, false);
    return inspected!;
  };

  const existing = await lookup();
  if (existing.confirmed) {
    stage = 'complete';
    log('success', 'revenuecat_provisioning_succeeded');
    return;
  }
  // Only a valid customer with no matching entitlement is eligible for one grant attempt.
  // Malformed data or an existing entitlement with another expiration is not safe to overwrite.
  if (existing.code !== 'revenuecat_entitlement_not_found') {
    stage = existing.stage;
    fail(existing.code);
  }

  operation = 'promotional_grant';
  const grantResponse = await request(grantUrl, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ end_time_ms: expiresAt }),
  });
  await requireSuccessfulStatus(grantResponse, [201]);
  const granted = await parseResponse(grantResponse, true);
  if (granted?.confirmed) {
    stage = 'complete';
    log('success', 'revenuecat_provisioning_succeeded', grantResponse.status);
    return;
  }

  // A 201 means RevenueCat accepted the grant, but only fresh Customer Info can confirm a
  // sparse, malformed, missing-entitlement, or mismatched grant response.
  operation = 'verification_lookup';
  const verified = await lookup();
  if (!verified.confirmed) {
    stage = verified.stage;
    fail(verified.code);
  }
  stage = 'complete';
  log('success', 'revenuecat_provisioning_succeeded');
}
