type Environment = Record<string, string | undefined>;

export type RevenueCatConfig = {
  secretApiKey: string;
  entitlementId: string;
};

export function getRevenueCatConfig(env: Environment = process.env): RevenueCatConfig {
  return {
    secretApiKey: env.REVENUECAT_SECRET_API_KEY?.trim() ?? '',
    entitlementId: 'pro',
  };
}

export async function grantJudgePromotionalEntitlement({
  appUserId,
  expiresAt,
  config = getRevenueCatConfig(),
  fetcher = fetch,
  timeoutMs = 10_000,
}: {
  appUserId: string;
  expiresAt: number;
  config?: RevenueCatConfig;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}): Promise<void> {
  if (!config.secretApiKey) throw new Error('RevenueCat secret API key is not configured.');
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
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`RevenueCat grant failed with status ${response.status}.`);

  const body = (await response.json()) as {
    subscriber?: { entitlements?: Record<string, { expires_date?: string | null } | undefined> };
  };
  const expiration = body.subscriber?.entitlements?.[config.entitlementId]?.expires_date;
  const confirmedExpiration = expiration ? Date.parse(expiration) : Number.NaN;
  if (!Number.isFinite(confirmedExpiration) || confirmedExpiration + 1_000 < expiresAt) {
    throw new Error('RevenueCat did not confirm the promotional entitlement expiration.');
  }
}
