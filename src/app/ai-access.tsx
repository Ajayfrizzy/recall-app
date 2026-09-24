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

export default function AiAccessScreen() {
  const router = useRouter();
  const { activate } = useAiAccess();
  const [code, setCode] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const submit = async () => {
    if (submitting.current || !code.trim()) return;
    submitting.current = true;
    setState('loading');
    setError(null);
    try {
      await activate(code);
      setCode('');
      setState('success');
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

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
                  Recall AI is active
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  This installation can now request protected AI analysis.
                </ThemedText>
                <ActionButton label="Continue" successLabel="Activated" onPress={leave} />
              </ThemedView>
            </FadeInView>
          ) : (
            <View style={styles.form}>
              <ThemedText type="smallBold">Invitation code</ThemedText>
              <TextInput
                value={code}
                onChangeText={(value) => {
                  setCode(value);
                  if (error) setError(null);
                }}
                placeholder="RCL-XXXXX-XXXXX-XXXXX-XXXXX"
                placeholderTextColor={Colors.dark.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                textContentType="oneTimeCode"
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
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
                state={state === 'loading' ? 'loading' : code.trim() ? 'idle' : 'disabled'}
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
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 28 },
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
