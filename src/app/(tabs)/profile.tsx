import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSubscription } from '@/features/subscription/context';

const PACKAGE_PERIOD_LABELS: Record<string, string> = {
  WEEKLY: 'week',
  MONTHLY: 'month',
  TWO_MONTH: '2 months',
  THREE_MONTH: '3 months',
  SIX_MONTH: '6 months',
  ANNUAL: 'year',
  LIFETIME: 'lifetime',
};

export default function ProfileScreen() {
  const [activeAction, setActiveAction] = useState<'upgrade' | 'restore' | 'retry'>();
  const {
    initialized,
    loading,
    isPro,
    offering,
    error,
    statusMessage,
    presentPaywall,
    restorePurchases,
    retry,
  } = useSubscription();
  const firstPackage = offering?.availablePackages[0];
  const period = firstPackage ? PACKAGE_PERIOD_LABELS[firstPackage.packageType] : undefined;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Profile</ThemedText>
        <ThemedText themeColor="textSecondary">
          Manage your Recall preferences and subscription.
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">{isPro ? 'Recall Pro' : 'Recall Free'}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {isPro
              ? 'Premium features active.'
              : 'Core screenshot organization remains available for free.'}
          </ThemedText>

          {!isPro ? (
            <View style={styles.benefits}>
              <ThemedText type="small">• Up to 5 Relevant Now cards</ThemedText>
              <ThemedText type="small">• Larger screenshot cleanup batches</ThemedText>
            </View>
          ) : null}

          {!isPro && firstPackage ? (
            <ThemedText type="smallBold">
              {firstPackage.product.priceString}
              {period ? ` / ${period}` : ''}
            </ThemedText>
          ) : null}

          {!isPro ? (
            <ActionButton
              label="Upgrade to Pro"
              loadingLabel="Opening paywall..."
              state={
                loading && activeAction === 'upgrade' ? 'loading' : loading ? 'disabled' : 'idle'
              }
              onPress={() => {
                setActiveAction('upgrade');
                void presentPaywall().finally(() => setActiveAction(undefined));
              }}
            />
          ) : null}

          <ActionButton
            label="Restore Purchases"
            loadingLabel="Restoring purchases..."
            variant="secondary"
            state={
              loading && activeAction === 'restore' ? 'loading' : loading ? 'disabled' : 'idle'
            }
            onPress={() => {
              setActiveAction('restore');
              void restorePurchases().finally(() => setActiveAction(undefined));
            }}
          />

          {!initialized ? (
            <ThemedText type="small" themeColor="textSecondary">
              Checking subscription…
            </ThemedText>
          ) : null}
          {statusMessage ? (
            <ThemedText type="small" accessibilityLiveRegion="polite">
              {statusMessage}
            </ThemedText>
          ) : null}
          {error ? (
            <View style={styles.errorBlock}>
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
              <ActionButton
                label="Retry"
                loadingLabel="Checking..."
                variant="ghost"
                compact
                state={
                  loading && activeAction === 'retry' ? 'loading' : loading ? 'disabled' : 'idle'
                }
                onPress={() => {
                  setActiveAction('retry');
                  void retry().finally(() => setActiveAction(undefined));
                }}
              />
            </View>
          ) : null}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 110 },
  card: { marginTop: 8, padding: 18, borderRadius: 8, gap: 12 },
  benefits: { gap: 4 },
  errorBlock: { gap: 2 },
});
