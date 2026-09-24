import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { type PAYWALL_RESULT } from 'react-native-purchases-ui';
import {
  getCurrentOffering,
  getRevenueCatAvailability,
  hasActiveRevenueCatAccess,
  judgeIdentityAction,
  RECALL_PRO_ENTITLEMENT,
  type RevenueCatAvailability,
} from '@/features/subscription/logic';

export { RECALL_PRO_ENTITLEMENT };
export type { CustomerInfo, PurchasesOffering, PurchasesPackage };

let configured = false;
let warnedAboutConfiguration = false;

function environment() {
  return {
    androidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  };
}

export function configureRevenueCat(): RevenueCatAvailability {
  const availability = getRevenueCatAvailability(Platform.OS, environment());
  if (!availability.available) {
    if (__DEV__ && !warnedAboutConfiguration) {
      const message =
        availability.reason === 'missing-key'
          ? `RevenueCat is disabled: EXPO_PUBLIC_REVENUECAT_${Platform.OS.toUpperCase()}_API_KEY is missing.`
          : `RevenueCat purchases are unavailable on ${Platform.OS}.`;
      console.warn(message);
      warnedAboutConfiguration = true;
    }
    return availability;
  }
  if (!configured) {
    if (__DEV__) void Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG).catch(() => undefined);
    Purchases.configure({ apiKey: availability.apiKey });
    configured = true;
  }
  return availability;
}

function requireConfiguration(): void {
  if (!configured) throw new Error('RevenueCat is not configured in this build.');
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  requireConfiguration();
  return Purchases.getCustomerInfo();
}

export async function connectJudgeRevenueCatIdentity(appUserId: string): Promise<CustomerInfo> {
  requireConfiguration();
  const [currentAppUserId, anonymous, currentInfo] = await Promise.all([
    Purchases.getAppUserID(),
    Purchases.isAnonymous(),
    Purchases.getCustomerInfo(),
  ]);
  const action = judgeIdentityAction({
    currentAppUserId,
    judgeAppUserId: appUserId,
    anonymous,
    hasActiveAccess: hasActiveRevenueCatAccess(currentInfo),
  });
  if (action === 'conflict') {
    throw new Error('An existing subscription identity is already active on this device.');
  }
  if (action === 'login') await Purchases.logIn(appUserId);
  await Purchases.invalidateCustomerInfoCache();
  return Purchases.getCustomerInfo();
}

export async function getCurrentRevenueCatOffering(): Promise<PurchasesOffering | undefined> {
  requireConfiguration();
  return getCurrentOffering(await Purchases.getOfferings());
}

export async function purchaseRevenueCatPackage(aPackage: PurchasesPackage) {
  requireConfiguration();
  return Purchases.purchasePackage(aPackage);
}

export async function restoreRevenueCatPurchases(): Promise<CustomerInfo> {
  requireConfiguration();
  return Purchases.restorePurchases();
}

export async function presentRevenueCatPaywall(
  offering?: PurchasesOffering,
): Promise<PAYWALL_RESULT> {
  requireConfiguration();
  return RevenueCatUI.presentPaywall({ offering, displayCloseButton: true });
}

export function addCustomerInfoListener(listener: CustomerInfoUpdateListener): () => void {
  requireConfiguration();
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}
