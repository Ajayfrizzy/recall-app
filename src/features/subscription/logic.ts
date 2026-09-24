export const RECALL_PRO_ENTITLEMENT = 'pro';

export type SubscriptionPlatform = 'android' | 'ios' | 'web' | string;

interface EntitlementCustomerInfo {
  activeSubscriptions?: string[];
  allPurchasedProductIdentifiers?: string[];
  nonSubscriptionTransactions?: unknown[];
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

export function hasActiveRevenueCatAccess(customerInfo?: EntitlementCustomerInfo): boolean {
  return (
    (customerInfo?.activeSubscriptions?.length ?? 0) > 0 ||
    Object.values(customerInfo?.entitlements?.active ?? {}).some(
      (entitlement) => entitlement?.isActive === true,
    )
  );
}

export function hasRevenueCatIdentityToProtect(customerInfo?: EntitlementCustomerInfo): boolean {
  return (
    hasActiveRevenueCatAccess(customerInfo) ||
    (customerInfo?.allPurchasedProductIdentifiers?.length ?? 0) > 0 ||
    (customerInfo?.nonSubscriptionTransactions?.length ?? 0) > 0
  );
}

export function judgeIdentityAction({
  currentAppUserId,
  judgeAppUserId,
  anonymous,
  hasActiveAccess,
}: {
  currentAppUserId: string;
  judgeAppUserId: string;
  anonymous: boolean;
  hasActiveAccess: boolean;
}): 'keep' | 'login' | 'conflict' {
  if (currentAppUserId === judgeAppUserId) return 'keep';
  if (hasActiveAccess) return 'conflict';
  return anonymous ? 'login' : 'conflict';
}

export async function connectJudgeIdentity<Customer>({
  judgeAppUserId,
  loadIdentity,
  hasProtectedIdentity,
  login,
  invalidateCustomerInfo,
  refreshCustomerInfo,
}: {
  judgeAppUserId: string;
  loadIdentity: () => Promise<{
    currentAppUserId: string;
    anonymous: boolean;
    customerInfo: Customer;
  }>;
  hasProtectedIdentity: (customerInfo: Customer) => boolean;
  login: (appUserId: string) => Promise<unknown>;
  invalidateCustomerInfo: () => Promise<void>;
  refreshCustomerInfo: () => Promise<Customer>;
}): Promise<Customer> {
  const current = await loadIdentity();
  const action = judgeIdentityAction({
    currentAppUserId: current.currentAppUserId,
    judgeAppUserId,
    anonymous: current.anonymous,
    hasActiveAccess: hasProtectedIdentity(current.customerInfo),
  });
  if (action === 'conflict') {
    throw new Error('An existing subscription identity is already active on this device.');
  }
  if (action === 'login') await login(judgeAppUserId);
  await invalidateCustomerInfo();
  return refreshCustomerInfo();
}

export async function activateJudgeProFlow<Customer, Credentials>({
  connectIdentity,
  provisionEntitlement,
  refreshIdentity,
  hasActiveEntitlement,
}: {
  connectIdentity: () => Promise<Customer>;
  provisionEntitlement: () => Promise<Credentials>;
  refreshIdentity: () => Promise<Customer>;
  hasActiveEntitlement: (customerInfo: Customer) => boolean;
}): Promise<{ credentials: Credentials; customerInfo: Customer; active: boolean }> {
  await connectIdentity();
  const credentials = await provisionEntitlement();
  const customerInfo = await refreshIdentity();
  return { credentials, customerInfo, active: hasActiveEntitlement(customerInfo) };
}
