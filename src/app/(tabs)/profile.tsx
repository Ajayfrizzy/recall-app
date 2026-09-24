import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSubscription } from '@/features/subscription/context';
import { useAiAccess } from '@/features/ai-access/context';
import { ConfirmationModal } from '@/components/confirmation-modal';

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
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<'upgrade' | 'restore' | 'retry' | 'judge-pro'>();
  const [judgeProMessage, setJudgeProMessage] = useState<string>();
  const [confirmDeactivation, setConfirmDeactivation] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const aiAccess = useAiAccess();
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
    activateJudgePro,
  } = useSubscription();
  const firstPackage = offering?.availablePackages[0];
  const period = firstPackage ? PACKAGE_PERIOD_LABELS[firstPackage.packageType] : undefined;
  const showPurchaseOptions = !isPro && aiAccess.credentials?.invitationType !== 'judge';
  const judgeCredentials =
    aiAccess.credentials?.invitationType === 'judge' ? aiAccess.credentials : undefined;

  const retryJudgePro = async () => {
    setActiveAction('judge-pro');
    setJudgeProMessage(undefined);
    try {
      const confirmed = await activateJudgePro(judgeCredentials!);
      setJudgeProMessage(
        confirmed
          ? 'Recall Pro is active.'
          : 'RevenueCat has not confirmed the active Pro entitlement on this device yet.',
      );
    } catch (activationError) {
      setJudgeProMessage(
        activationError instanceof Error
          ? activationError.message
          : 'Recall Pro could not be activated. Please try again.',
      );
    } finally {
      setActiveAction(undefined);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Profile</ThemedText>
        <ThemedText themeColor="textSecondary">
          Manage your Recall preferences and subscription.
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">AI Access</ThemedText>
          <ThemedText themeColor="textSecondary">
            {aiAccess.authorizationState === 'loading'
              ? 'Checking secure AI access…'
              : aiAccess.authorizationState === 'active'
                ? 'Recall AI is active.'
                : aiAccess.authorizationState === 'expired'
                  ? 'Your AI access has expired.'
                  : 'Recall AI is not activated.'}
          </ThemedText>
          {aiAccess.expiresAt ? (
            <ThemedText type="small" themeColor="textSecondary">
              Access expires {new Date(aiAccess.expiresAt).toLocaleDateString()}.
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {aiAccess.credentials?.invitationType === 'judge'
              ? `Judge access includes complimentary Pro through ${new Date(
                  aiAccess.credentials.judgeAccessExpiresAt ?? aiAccess.credentials.expiresAt,
                ).toLocaleDateString()}.`
              : 'Standard invitation access is separate from Recall Pro.'}
          </ThemedText>
          {aiAccess.activated ? (
            <View style={styles.aiActions}>
              <ActionButton
                label="Replace Access"
                variant="secondary"
                onPress={() => router.push('/ai-access')}
              />
              <ActionButton
                label="Deactivate"
                variant="ghost"
                state={deactivating ? 'loading' : 'idle'}
                onPress={() => setConfirmDeactivation(true)}
              />
            </View>
          ) : (
            <ActionButton
              label="Activate AI"
              state={aiAccess.initialized ? 'idle' : 'disabled'}
              onPress={() => router.push('/ai-access')}
            />
          )}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">{isPro ? 'Recall Pro Active' : 'Recall Free'}</ThemedText>
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

          {showPurchaseOptions && firstPackage ? (
            <ThemedText type="smallBold">
              {firstPackage.product.priceString}
              {period ? ` / ${period}` : ''}
            </ThemedText>
          ) : null}

          {showPurchaseOptions ? (
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

          {judgeCredentials && !isPro ? (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                {judgeCredentials.proProvisioning === 'confirmed'
                  ? 'Complimentary Pro was provisioned, but RevenueCat has not confirmed it on this device.'
                  : 'Complimentary Pro provisioning is pending.'}
              </ThemedText>
              <ActionButton
                label="Retry Pro Activation"
                loadingLabel="Activating Recall Pro..."
                variant="secondary"
                state={activeAction === 'judge-pro' ? 'loading' : loading ? 'disabled' : 'idle'}
                onPress={() => void retryJudgePro()}
              />
            </>
          ) : null}

          {!isPro && judgeProMessage ? (
            <ThemedText type="small" accessibilityLiveRegion="polite">
              {judgeProMessage}
            </ThemedText>
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
      <ConfirmationModal
        visible={confirmDeactivation}
        title="Deactivate Recall AI?"
        message="This removes the installation token from this device. A new invitation code will be required to activate AI again."
        confirmLabel="Deactivate"
        destructive
        onCancel={() => setConfirmDeactivation(false)}
        onConfirm={() => {
          setConfirmDeactivation(false);
          setDeactivating(true);
          void aiAccess.deactivate().finally(() => setDeactivating(false));
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 110 },
  card: { marginTop: 8, padding: 18, borderRadius: 8, gap: 12 },
  benefits: { gap: 4 },
  errorBlock: { gap: 2 },
  aiActions: { gap: 8 },
});
