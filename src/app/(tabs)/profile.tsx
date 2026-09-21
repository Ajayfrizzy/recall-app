import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
            <PrimaryButton
              label={loading ? 'Opening…' : 'Upgrade to Pro'}
              disabled={loading}
              onPress={() => void presentPaywall()}
            />
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
            disabled={loading}
            onPress={() => void restorePurchases()}
            style={styles.secondaryButton}
          >
            <ThemedText type="smallBold">
              {loading ? 'Please wait…' : 'Restore Purchases'}
            </ThemedText>
          </Pressable>

          {!initialized ? (
            <ThemedText type="small" themeColor="textSecondary">
              Checking subscription…
            </ThemedText>
          ) : null}
          {statusMessage ? <ThemedText type="small">{statusMessage}</ThemedText> : null}
          {error ? (
            <View style={styles.errorBlock}>
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
              <Pressable accessibilityRole="button" disabled={loading} onPress={() => void retry()}>
                <ThemedText type="linkPrimary">Retry</ThemedText>
              </Pressable>
            </View>
          ) : null}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

function PrimaryButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled && styles.disabled]}
    >
      <ThemedText style={styles.primaryButtonText}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 110 },
  card: { marginTop: 8, padding: 18, borderRadius: 12, gap: 12 },
  benefits: { gap: 4 },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#208AEF',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8b8d98',
    borderRadius: 8,
  },
  disabled: { opacity: 0.5 },
  errorBlock: { gap: 2 },
});
