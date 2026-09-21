export const RECALL_PRO_ENTITLEMENT = 'pro';

export type SubscriptionPlatform = 'android' | 'ios' | 'web' | string;

interface EntitlementCustomerInfo {
  entitlements?: {
    active?: Record<string, { isActive?: boolean } | undefined>;
  };
}

interface OfferingCollection<T> {
  current?: T | null;
}

interface PurchasesLikeError {
  code?: string | number;
  userCancelled?: boolean | null;
}

export interface RevenueCatEnvironment {
  androidApiKey?: string;
  iosApiKey?: string;
}

export interface SubscriptionResources<Customer, Offering> {
  customerInfo?: Customer;
  offering?: Offering;
  failed: boolean;
}

export type RevenueCatAvailability =
  | { available: true; apiKey: string }
  | { available: false; reason: 'missing-key' | 'unsupported-platform' };

export function getRevenueCatAvailability(
  platform: SubscriptionPlatform,
  environment: RevenueCatEnvironment,
): RevenueCatAvailability {
  if (platform !== 'android' && platform !== 'ios') {
    return { available: false, reason: 'unsupported-platform' };
  }
  const apiKey = platform === 'android' ? environment.androidApiKey : environment.iosApiKey;
  return apiKey?.trim()
    ? { available: true, apiKey: apiKey.trim() }
    : { available: false, reason: 'missing-key' };
}

export function hasActiveProEntitlement(customerInfo?: EntitlementCustomerInfo): boolean {
  return customerInfo?.entitlements?.active?.[RECALL_PRO_ENTITLEMENT]?.isActive === true;
}

export function getCurrentOffering<T>(offerings?: OfferingCollection<T>): T | undefined {
  return offerings?.current ?? undefined;
}

export function isPurchaseCancellation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as PurchasesLikeError;
  return candidate.userCancelled === true || String(candidate.code) === '1';
}

export function didRestorePro(customerInfo?: EntitlementCustomerInfo): boolean {
  return hasActiveProEntitlement(customerInfo);
}

export async function loadSubscriptionResources<Customer, Offering>(
  loadCustomerInfo: () => Promise<Customer>,
  loadOffering: () => Promise<Offering | undefined>,
): Promise<SubscriptionResources<Customer, Offering>> {
  const [customerResult, offeringResult] = await Promise.allSettled([
    loadCustomerInfo(),
    loadOffering(),
  ]);
  return {
    ...(customerResult.status === 'fulfilled' ? { customerInfo: customerResult.value } : {}),
    ...(offeringResult.status === 'fulfilled' ? { offering: offeringResult.value } : {}),
    failed: customerResult.status === 'rejected' || offeringResult.status === 'rejected',
  };
}

export function shouldForceProInDevelopment(isDevelopment: boolean, value?: string): boolean {
  return isDevelopment && value?.toLowerCase() === 'true';
}
