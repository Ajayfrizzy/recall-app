import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { ActionButton } from '@/components/action-button';
import { FadeInView } from '@/components/motion';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius } from '@/constants/theme';
import { useAiAccess } from '@/features/ai-access/context';
import { useSubscription } from '@/features/subscription/context';
import {
  formatInvitationCodeInput,
  isCompleteInvitationCode,
  INVITATION_PREFIX,
} from '../../shared/invitation-code';

export default function AiAccessScreen() {
  const router = useRouter();
  const { activate, retryJudgePro } = useAiAccess();
  const { confirmJudgePro } = useSubscription();
  const [code, setCode] = useState(INVITATION_PREFIX);
  const [selection, setSelection] = useState({
    start: INVITATION_PREFIX.length,
    end: INVITATION_PREFIX.length,
  });
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [judgeExpiration, setJudgeExpiration] = useState<number | null>(null);
  const [proConfirmed, setProConfirmed] = useState(false);
  const [proError, setProError] = useState<string | null>(null);
  const [proLoading, setProLoading] = useState(false);
  const submitting = useRef(false);
  const selectionRef = useRef(selection);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const submit = async () => {
    if (submitting.current) return;
    if (!isCompleteInvitationCode(code)) {
      setError('Enter the complete invitation code.');
      return;
    }
    submitting.current = true;
    setState('loading');
    setError(null);
    try {
      const credentials = await activate(code);
      setState('success');
      if (credentials.invitationType === 'judge') {
        setJudgeExpiration(credentials.judgeAccessExpiresAt ?? credentials.expiresAt);
        setProLoading(true);
        let judge = credentials;
        try {
          if (judge.proProvisioning !== 'confirmed') judge = await retryJudgePro();
          const confirmed = await confirmJudgePro(judge.revenueCatAppUserId!);
          setProConfirmed(confirmed);
          if (!confirmed) setProError('Recall Pro activation is still pending.');
        } catch {
          setProError('Recall Pro could not be activated. Your AI access is safe; try again.');
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
      const credentials = await retryJudgePro();
      const confirmed = await confirmJudgePro(credentials.revenueCatAppUserId!);
      setProConfirmed(confirmed);
      if (!confirmed) setProError('Recall Pro activation is still pending.');
    } catch {
      setProError('Recall Pro could not be activated. Please try again.');
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
                      style={proConfirmed ? styles.successText : undefined}
                      accessibilityLiveRegion="polite"
                    >
                      {proConfirmed
                        ? 'Recall Pro Active'
                        : proLoading
                          ? 'Activating Recall Pro...'
                          : 'Recall Pro activation pending'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Judge access expires {new Date(judgeExpiration).toLocaleDateString()}.
                    </ThemedText>
                    {proError ? <ThemedText style={styles.error}>{proError}</ThemedText> : null}
                    {!proConfirmed ? (
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
              <TextInput
                value={code}
                onChangeText={(value) => {
                  const previous = selectionRef.current;
                  const delta = value.length - code.length;
                  const cursor =
                    previous.start === previous.end
                      ? Math.max(0, previous.start + delta)
                      : value.length;
                  const edit = formatInvitationCodeInput(value, cursor);
                  setCode(edit.value);
                  setSelection(edit.selection);
                  selectionRef.current = edit.selection;
                  if (error) setError(null);
                }}
                selection={selection}
                onSelectionChange={(
                  event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
                ) => {
                  selectionRef.current = event.nativeEvent.selection;
                  setSelection(event.nativeEvent.selection);
                }}
                placeholder="RCL-XXXXX-XXXXX-XXXXX-XXXXX"
                placeholderTextColor={Colors.dark.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                textContentType="oneTimeCode"
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (isCompleteInvitationCode(code)) void submit();
                }}
                editable={state !== 'loading'}
                style={styles.input}
                accessibilityLabel="AI invitation code"
              />
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
                    : isCompleteInvitationCode(code)
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
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.medium,
    paddingHorizontal: 14,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.backgroundElement,
    fontSize: 16,
  },
  error: { color: Colors.dark.danger },
  successCard: { padding: 20, borderRadius: Radius.large, gap: 14 },
  successText: { color: Colors.dark.success },
});
