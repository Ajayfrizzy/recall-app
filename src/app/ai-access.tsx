import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { ActionButton } from '@/components/action-button';
import { FadeInView } from '@/components/motion';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius } from '@/constants/theme';
import { useAiAccess } from '@/features/ai-access/context';
import { useSubscription } from '@/features/subscription/context';
import {
  invitationCodePreview,
  isCompleteInvitationCode,
  INVITATION_PREFIX,
  normalizeInvitationBodyInput,
  normalizeInvitationCode,
} from '../../shared/invitation-code';

export default function AiAccessScreen() {
  const router = useRouter();
  const { activate, credentials: aiCredentials } = useAiAccess();
  const { activateJudgePro, isPro } = useSubscription();
  const [codeBody, setCodeBody] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [judgeExpiration, setJudgeExpiration] = useState<number | null>(null);
  const [proConfirmed, setProConfirmed] = useState(false);
  const [proError, setProError] = useState<string | null>(null);
  const [proLoading, setProLoading] = useState(false);
  const submitting = useRef(false);
  const proActive = proConfirmed || isPro;

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const submit = async () => {
    if (submitting.current) return;
    if (!isCompleteInvitationCode(codeBody)) {
      setError('Enter the complete invitation code.');
      return;
    }
    submitting.current = true;
    setState('loading');
    setError(null);
    try {
      const credentials = await activate(normalizeInvitationCode(codeBody));
      setState('success');
      if (credentials.invitationType === 'judge') {
        setJudgeExpiration(credentials.judgeAccessExpiresAt ?? credentials.expiresAt);
        setProLoading(true);
        try {
          const confirmed = await activateJudgePro(credentials);
          setProConfirmed(confirmed);
          if (!confirmed) setProError('Recall Pro activation is still pending.');
        } catch (proActivationError) {
          setProError(
            proActivationError instanceof Error
              ? `${proActivationError.message} Your AI access remains active.`
              : 'Recall Pro could not be activated. Your AI access remains active; try again.',
          );
        } finally {
          setProLoading(false);
        }
      }
    } catch (activationError) {
      setState('idle');
      setError(
        activationError instanceof Error
          ? activationError.message
          : 'Recall AI could not complete activation. Please try again later.',
      );
    } finally {
      submitting.current = false;
    }
  };

  const retryPro = async () => {
    if (proLoading) return;
    setProLoading(true);
    setProError(null);
    try {
      if (!aiCredentials || aiCredentials.invitationType !== 'judge') {
        throw new Error('Judge access is not active on this installation.');
      }
      const confirmed = await activateJudgePro(aiCredentials);
      setProConfirmed(confirmed);
      if (!confirmed) setProError('Recall Pro activation is still pending.');
    } catch (proActivationError) {
      setProError(
        proActivationError instanceof Error
          ? proActivationError.message
          : 'Recall Pro could not be activated. Please try again.',
      );
    } finally {
      setProLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          <FadeInView>
            <View style={styles.intro}>
              <ThemedText type="title">Activate Recall AI</ThemedText>
              <ThemedText themeColor="textSecondary">
                Enter your invitation code to enable secure AI analysis. You can continue using
                Recall&apos;s on-device features without an invitation.
              </ThemedText>
            </View>
          </FadeInView>

          {state === 'success' ? (
            <FadeInView>
              <ThemedView type="backgroundElement" style={styles.successCard}>
                <ThemedText type="subtitle" style={styles.successText}>
                  Recall AI Active
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  This installation can now request protected AI analysis.
                </ThemedText>
                {judgeExpiration ? (
                  <>
                    <ThemedText
                      type="smallBold"
                      style={proActive ? styles.successText : undefined}
                      accessibilityLiveRegion="polite"
                    >
                      {proActive
                        ? 'Recall Pro Active'
                        : proLoading
                          ? 'Activating Recall Pro...'
                          : 'Recall Pro activation pending'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Judge access expires {new Date(judgeExpiration).toLocaleDateString()}.
                    </ThemedText>
                    {!proActive && proError ? (
                      <ThemedText style={styles.error}>{proError}</ThemedText>
                    ) : null}
                    {!proActive ? (
                      <ActionButton
                        label="Retry Pro Activation"
                        loadingLabel="Activating Recall Pro..."
                        variant="secondary"
                        state={proLoading ? 'loading' : 'idle'}
                        onPress={() => void retryPro()}
                      />
                    ) : null}
                  </>
                ) : null}
                <ActionButton label="Continue" onPress={leave} />
              </ThemedView>
            </FadeInView>
          ) : (
            <View style={styles.form}>
              <ThemedText type="smallBold">Invitation code</ThemedText>
              <View style={styles.codeInputRow}>
                <ThemedText type="smallBold" style={styles.codePrefix}>
                  {INVITATION_PREFIX}
                </ThemedText>
                <TextInput
                  value={codeBody}
                  onChangeText={(value) => {
                    setCodeBody(normalizeInvitationBodyInput(value));
                    if (error) setError(null);
                  }}
                  placeholder="XXXXXXXXXXXXXXXXXXXX"
                  placeholderTextColor={Colors.dark.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="oneTimeCode"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (isCompleteInvitationCode(codeBody)) void submit();
                  }}
                  editable={state !== 'loading'}
                  style={styles.input}
                  accessibilityLabel="AI invitation code body"
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {invitationCodePreview(codeBody)}
              </ThemedText>
              {error ? (
                <ThemedText style={styles.error} accessibilityLiveRegion="polite">
                  {error}
                </ThemedText>
              ) : null}
              <ActionButton
                label="Activate AI"
                loadingLabel="Activating securely…"
                state={
                  state === 'loading'
                    ? 'loading'
                    : isCompleteInvitationCode(codeBody)
                      ? 'idle'
                      : 'disabled'
                }
                onPress={() => void submit()}
              />
              <ActionButton label="Continue without AI" variant="ghost" onPress={leave} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'flex-start', padding: 24, paddingTop: 28, gap: 24 },
  intro: { gap: 10 },
  form: { gap: 12 },
  codeInputRow: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.medium,
    backgroundColor: Colors.dark.backgroundElement,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  codePrefix: { color: Colors.dark.text, fontSize: 16 },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 12,
    color: Colors.dark.text,
    fontSize: 16,
  },
  error: { color: Colors.dark.danger },
  successCard: { padding: 20, borderRadius: Radius.large, gap: 14 },
  successText: { color: Colors.dark.success },
});
