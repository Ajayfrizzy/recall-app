import { normalizeInvitationCode } from '../../../shared/invitation-code';

export type AiAccessCredentials = {
  accessToken: string;
  expiresAt: number;
  invitationType: 'standard' | 'judge';
  judgeAccessExpiresAt?: number;
  revenueCatAppUserId?: string;
  proProvisioning?: 'pending' | 'confirmed';
};

export type AiAccessErrorCode =
  | 'not_configured'
  | 'insecure_backend_url'
  | 'secure_storage_unavailable'
  | 'invalid_invitation'
  | 'invitation_already_redeemed'
  | 'invitation_expired'
  | 'redemption_rate_limited'
  | 'network_timeout'
  | 'backend_unavailable'
  | 'provisioning_unavailable'
  | 'revenuecat_not_configured'
  | 'revenuecat_authentication_failed'
  | 'revenuecat_project_or_entitlement_mismatch'
  | 'revenuecat_grant_rejected'
  | 'revenuecat_invalid_response'
  | 'revenuecat_expiration_mismatch'
  | 'revenuecat_network_timeout'
  | 'revenuecat_network_failure'
  | 'malformed_response';

export class AiAccessError extends Error {
  constructor(
    readonly code: AiAccessErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AiAccessError';
  }
}

export interface AiAccessStorage {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  remove(): Promise<void>;
}

export type LoadedAiAccess = {
  credentials: AiAccessCredentials | null;
  expired: boolean;
};

const ACTIVATION_MESSAGES: Record<string, string> = {
  invalid_invitation: 'That invitation code is not valid.',
  invitation_already_redeemed: 'That invitation code has already been redeemed.',
  invitation_expired: 'That invitation code has expired.',
  redemption_rate_limited: 'Too many unsuccessful attempts. Please try again later.',
};

const PROVISIONING_MESSAGES: Record<string, string> = {
  revenuecat_not_configured: 'Complimentary Pro is not configured on the server yet.',
  revenuecat_authentication_failed: 'The server could not authenticate with RevenueCat.',
  revenuecat_project_or_entitlement_mismatch:
    'The RevenueCat project or Pro entitlement does not match this build.',
  revenuecat_grant_rejected: 'RevenueCat rejected the complimentary Pro grant.',
  revenuecat_invalid_response: 'RevenueCat returned an invalid Pro activation response.',
  revenuecat_expiration_mismatch: 'RevenueCat returned the wrong Pro expiration date.',
  revenuecat_network_timeout: 'The server timed out while contacting RevenueCat.',
  revenuecat_network_failure: 'The server could not reach RevenueCat.',
  provisioning_unavailable: 'Recall Pro could not be activated. Please try again.',
};

export function parseAiAccessCredentials(value: unknown): AiAccessCredentials | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<AiAccessCredentials>;
  if (
    typeof candidate.accessToken !== 'string' ||
    !/^rcl_at_[A-Za-z0-9_-]{20,}$/.test(candidate.accessToken) ||
    typeof candidate.expiresAt !== 'number' ||
    !Number.isSafeInteger(candidate.expiresAt) ||
    candidate.expiresAt <= 0
  ) {
    return null;
  }
  const invitationType = candidate.invitationType === 'judge' ? 'judge' : 'standard';
  if (
    invitationType === 'judge' &&
    (typeof candidate.judgeAccessExpiresAt !== 'number' ||
      !Number.isSafeInteger(candidate.judgeAccessExpiresAt) ||
      typeof candidate.revenueCatAppUserId !== 'string' ||
      !/^recall_judge_[A-Za-z0-9-]+$/.test(candidate.revenueCatAppUserId) ||
      (candidate.proProvisioning !== 'pending' && candidate.proProvisioning !== 'confirmed'))
  ) {
    return null;
  }
  return {
    accessToken: candidate.accessToken,
    expiresAt: candidate.expiresAt,
    invitationType,
    ...(invitationType === 'judge'
      ? {
          judgeAccessExpiresAt: candidate.judgeAccessExpiresAt,
          revenueCatAppUserId: candidate.revenueCatAppUserId,
          proProvisioning: candidate.proProvisioning,
        }
      : {}),
  };
}

export function resolveAnalysisApiUrl(
  rawUrl: string | undefined,
  allowInsecureDevelopmentHttp: boolean,
): string {
  const value = rawUrl?.trim().replace(/\/$/, '');
  if (!value) {
    throw new AiAccessError('not_configured', 'Recall AI is not configured in this build.');
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new AiAccessError('not_configured', 'Recall AI is not configured in this build.');
  }
  if (
    parsed.protocol !== 'https:' &&
    !(parsed.protocol === 'http:' && allowInsecureDevelopmentHttp)
  ) {
    throw new AiAccessError(
      'insecure_backend_url',
      'Recall AI requires a secure backend connection.',
    );
  }
  return value;
}

export function createAiAccessClient({
  storage,
  getBaseUrl,
  fetcher = fetch,
  timeoutMs = 12_000,
  now = Date.now,
}: {
  storage: AiAccessStorage;
  getBaseUrl: () => string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
}) {
  let activationInFlight: Promise<AiAccessCredentials> | null = null;

  async function clear(): Promise<void> {
    await storage.remove();
  }

  async function load(): Promise<LoadedAiAccess> {
    const stored = await storage.get();
    if (!stored) return { credentials: null, expired: false };
    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      await clear();
      return { credentials: null, expired: false };
    }
    const credentials = parseAiAccessCredentials(parsed);
    if (!credentials) {
      await clear();
      return { credentials: null, expired: false };
    }
    if (credentials.expiresAt <= now()) {
      await clear();
      return { credentials: null, expired: true };
    }
    return { credentials, expired: false };
  }

  async function redeem(code: string): Promise<AiAccessCredentials> {
    if (activationInFlight) return activationInFlight;
    activationInFlight = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        let response: Response;
        try {
          response = await fetcher(`${getBaseUrl()}/access/redeem`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: normalizeInvitationCode(code) }),
            signal: controller.signal,
          });
        } catch (error) {
          if (controller.signal.aborted) {
            throw new AiAccessError(
              'network_timeout',
              'Activation timed out. Check your connection and try again.',
              { cause: error },
            );
          }
          if (error instanceof AiAccessError) throw error;
          throw new AiAccessError(
            'backend_unavailable',
            'Recall AI could not be reached. Check your connection and try again.',
            { cause: error },
          );
        }

        let body: unknown;
        try {
          body = await response.json();
        } catch (error) {
          throw new AiAccessError(
            'malformed_response',
            'Recall AI returned an invalid response. Please try again later.',
            { cause: error },
          );
        }
        if (!response.ok) {
          const serverCode =
            body &&
            typeof body === 'object' &&
            typeof (body as { error?: unknown }).error === 'string'
              ? (body as { error: string }).error
              : '';
          const knownMessage = ACTIVATION_MESSAGES[serverCode];
          if (knownMessage) {
            throw new AiAccessError(serverCode as AiAccessErrorCode, knownMessage);
          }
          throw new AiAccessError(
            'backend_unavailable',
            'Recall AI could not complete activation. Please try again later.',
          );
        }

        const credentials = parseAiAccessCredentials(body);
        if (!credentials || credentials.expiresAt <= now()) {
          throw new AiAccessError(
            'malformed_response',
            'Recall AI returned an invalid activation response.',
          );
        }
        try {
          await storage.set(JSON.stringify(credentials));
        } catch (error) {
          throw new AiAccessError(
            'secure_storage_unavailable',
            'Secure credential storage is unavailable on this device.',
            { cause: error },
          );
        }
        return credentials;
      } finally {
        clearTimeout(timeout);
      }
    })();
    try {
      return await activationInFlight;
    } finally {
      activationInFlight = null;
    }
  }

  async function provisionJudgeEntitlement(
    credentials: AiAccessCredentials,
  ): Promise<AiAccessCredentials> {
    if (credentials.invitationType !== 'judge') return credentials;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response: Response;
      try {
        response = await fetcher(`${getBaseUrl()}/access/judge-entitlement`, {
          method: 'POST',
          headers: { authorization: `Bearer ${credentials.accessToken}` },
          signal: controller.signal,
        });
      } catch (error) {
        throw new AiAccessError(
          controller.signal.aborted ? 'network_timeout' : 'provisioning_unavailable',
          controller.signal.aborted
            ? 'Pro activation timed out. Please try again.'
            : 'Recall Pro could not be activated. Please try again.',
          { cause: error },
        );
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch (error) {
        throw new AiAccessError(
          'malformed_response',
          'Recall Pro activation returned an invalid response.',
          { cause: error },
        );
      }
      if (!response.ok) {
        const serverCode =
          body &&
          typeof body === 'object' &&
          typeof (body as { error?: unknown }).error === 'string'
            ? (body as { error: string }).error
            : 'provisioning_unavailable';
        const code =
          serverCode in PROVISIONING_MESSAGES
            ? (serverCode as AiAccessErrorCode)
            : 'provisioning_unavailable';
        throw new AiAccessError(
          code,
          PROVISIONING_MESSAGES[code] ?? PROVISIONING_MESSAGES.provisioning_unavailable,
        );
      }
      const next = parseAiAccessCredentials({
        ...credentials,
        ...(body as Partial<AiAccessCredentials>),
      });
      if (!next || next.proProvisioning !== 'confirmed') {
        throw new AiAccessError(
          'malformed_response',
          'Recall Pro activation could not be confirmed. Please try again.',
        );
      }
      await storage.set(JSON.stringify(next));
      return next;
    } finally {
      clearTimeout(timeout);
    }
  }

  return { load, redeem, provisionJudgeEntitlement, clear };
}
