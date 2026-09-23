import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  addCustomerInfoListener,
  configureRevenueCat,
  getCurrentRevenueCatOffering,
  getCustomerInfo,
  presentRevenueCatPaywall,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from '@/services/revenuecat';
import {
  didRestorePro,
  hasActiveProEntitlement,
  isPurchaseCancellation,
  loadSubscriptionResources,
  shouldForceProInDevelopment,
} from './logic';

export type SubscriptionActionResult = 'success' | 'cancelled' | 'unavailable' | 'error';

interface SubscriptionContextValue {
  initialized: boolean;
  loading: boolean;
  isPro: boolean;
  available: boolean;
  customerInfo?: CustomerInfo;
  offering?: PurchasesOffering;
  error?: string;
  statusMessage?: string;
  refreshCustomerInfo: () => Promise<void>;
  retry: () => Promise<void>;
  purchasePackage: (aPackage: PurchasesPackage) => Promise<SubscriptionActionResult>;
  restorePurchases: () => Promise<SubscriptionActionResult>;
  presentPaywall: () => Promise<SubscriptionActionResult>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);
const TEMPORARILY_UNAVAILABLE = 'Subscriptions are temporarily unavailable.';

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>();
  const [offering, setOffering] = useState<PurchasesOffering>();
  const [error, setError] = useState<string>();
  const [statusMessage, setStatusMessage] = useState<string>();
  const actionInFlight = useRef(false);
  const forcePro = shouldForceProInDevelopment(__DEV__, process.env.EXPO_PUBLIC_DEV_FORCE_PRO);

  const refreshCustomerInfo = useCallback(async () => {
    if (!available) return;
    try {
      setCustomerInfo(await getCustomerInfo());
      setError(undefined);
    } catch {
      setError(TEMPORARILY_UNAVAILABLE);
    }
  }, [available]);

  const loadSubscription = useCallback(async () => {
    const configuration = configureRevenueCat();
    if (!configuration.available) {
      setAvailable(false);
      setInitialized(true);
      setError(
        configuration.reason === 'missing-key'
          ? 'Subscriptions are not configured in this build.'
          : 'Subscriptions are unavailable on this platform.',
      );
      return;
    }
    setAvailable(true);
    setLoading(true);
    setError(undefined);
    setStatusMessage(undefined);
    const resources = await loadSubscriptionResources(
      getCustomerInfo,
      getCurrentRevenueCatOffering,
    );
    if (resources.customerInfo) setCustomerInfo(resources.customerInfo);
    setOffering(resources.offering);
    if (resources.failed) {
      setError(TEMPORARILY_UNAVAILABLE);
    } else if (!resources.offering) {
      setError('No subscription offering is configured.');
    }
    setLoading(false);
    setInitialized(true);
  }, []);

  useEffect(() => {
    const configuration = configureRevenueCat();
    let removeListener: (() => void) | undefined;
    if (configuration.available) {
      removeListener = addCustomerInfoListener((updated) => {
        setCustomerInfo(updated);
        setError(undefined);
      });
    }
    void loadSubscription();
    return () => removeListener?.();
  }, [loadSubscription]);

  const purchasePackage = useCallback(
    async (aPackage: PurchasesPackage): Promise<SubscriptionActionResult> => {
      if (actionInFlight.current) return 'error';
      if (!available) {
        setError('Subscriptions are not configured in this build.');
        return 'unavailable';
      }
      actionInFlight.current = true;
      setLoading(true);
      setError(undefined);
      setStatusMessage(undefined);
      try {
        const result = await purchaseRevenueCatPackage(aPackage);
        setCustomerInfo(result.customerInfo);
        return 'success';
      } catch (purchaseError) {
        if (isPurchaseCancellation(purchaseError)) return 'cancelled';
        setError(TEMPORARILY_UNAVAILABLE);
        return 'error';
      } finally {
        actionInFlight.current = false;
        setLoading(false);
      }
    },
    [available],
  );

  const restorePurchases = useCallback(async (): Promise<SubscriptionActionResult> => {
    if (actionInFlight.current) return 'error';
    if (!available) {
      setError('Subscriptions are not configured in this build.');
      return 'unavailable';
    }
    actionInFlight.current = true;
    setLoading(true);
    setError(undefined);
    setStatusMessage(undefined);
    try {
      const restored = await restoreRevenueCatPurchases();
      setCustomerInfo(restored);
      setStatusMessage(
        didRestorePro(restored)
          ? 'Recall Pro was restored successfully.'
          : 'No active Pro entitlement was found.',
      );
      return 'success';
    } catch {
      setError('Purchases could not be restored. Please try again.');
      return 'error';
    } finally {
      actionInFlight.current = false;
      setLoading(false);
    }
  }, [available]);

  const presentPaywall = useCallback(async (): Promise<SubscriptionActionResult> => {
    if (actionInFlight.current) return 'error';
    if (!available || !offering) {
      setError(
        available
          ? 'No subscription offering is configured.'
          : 'Subscriptions are not configured in this build.',
      );
      return 'unavailable';
    }
    actionInFlight.current = true;
    setLoading(true);
    setError(undefined);
    setStatusMessage(undefined);
    try {
      const result = await presentRevenueCatPaywall(offering);
      if (result === 'CANCELLED') return 'cancelled';
      if (result === 'ERROR') {
        setError(TEMPORARILY_UNAVAILABLE);
        return 'error';
      }
      await refreshCustomerInfo();
      return 'success';
    } catch (paywallError) {
      if (isPurchaseCancellation(paywallError)) return 'cancelled';
      setError(TEMPORARILY_UNAVAILABLE);
      return 'error';
    } finally {
      actionInFlight.current = false;
      setLoading(false);
    }
  }, [available, offering, refreshCustomerInfo]);

  const isPro = forcePro || hasActiveProEntitlement(customerInfo);
  const value = useMemo<SubscriptionContextValue>(
    () => ({
      initialized,
      loading,
      isPro,
      available,
      customerInfo,
      offering,
      error,
      statusMessage,
      refreshCustomerInfo,
      retry: loadSubscription,
      purchasePackage,
      restorePurchases,
      presentPaywall,
    }),
    [
      initialized,
      loading,
      isPro,
      available,
      customerInfo,
      offering,
      error,
      statusMessage,
      refreshCustomerInfo,
      loadSubscription,
      purchasePackage,
      restorePurchases,
      presentPaywall,
    ],
  );
  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error('useSubscription must be used within SubscriptionProvider');
  return value;
}
