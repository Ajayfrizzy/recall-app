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
  connectJudgeIdentity,
  hasRevenueCatIdentityToProtect,
  RECALL_PRO_ENTITLEMENT,
  type RevenueCatAvailability,
} from '@/features/subscription/logic';

export { RECALL_PRO_ENTITLEMENT };
export type { CustomerInfo, PurchasesOffering, PurchasesPackage };

let configured = false;
let warnedAboutConfiguration = false;
let judgeConnectionInFlight: { appUserId: string; promise: Promise<CustomerInfo> } | undefined;

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
  if (judgeConnectionInFlight?.appUserId === appUserId) {
    return judgeConnectionInFlight.promise;
  }
  if (judgeConnectionInFlight) {
    throw new Error('A different RevenueCat identity activation is already in progress.');
  }
  const promise = connectJudgeIdentity({
    judgeAppUserId: appUserId,
    loadIdentity: async () => {
      const [currentAppUserId, anonymous, customerInfo] = await Promise.all([
        Purchases.getAppUserID(),
        Purchases.isAnonymous(),
        Purchases.getCustomerInfo(),
      ]);
      return { currentAppUserId, anonymous, customerInfo };
    },
    hasProtectedIdentity: hasRevenueCatIdentityToProtect,
    login: (judgeId) => Purchases.logIn(judgeId),
    invalidateCustomerInfo: () => Purchases.invalidateCustomerInfoCache(),
    refreshCustomerInfo: () => Purchases.getCustomerInfo(),
  });
  judgeConnectionInFlight = { appUserId, promise };
  try {
    return await promise;
  } finally {
    if (judgeConnectionInFlight?.promise === promise) judgeConnectionInFlight = undefined;
  }
}

export async function refreshJudgeRevenueCatIdentity(appUserId: string): Promise<CustomerInfo> {
  requireConfiguration();
  const currentAppUserId = await Purchases.getAppUserID();
  if (currentAppUserId !== appUserId) {
    throw new Error('RevenueCat is not connected to the judge identity.');
  }
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
