export type AiAccessCredentials = {
  accessToken: string;
  expiresAt: number;
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
  return { accessToken: candidate.accessToken, expiresAt: candidate.expiresAt };
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
            body: JSON.stringify({ code: code.trim() }),
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

  return { load, redeem, clear };
}
