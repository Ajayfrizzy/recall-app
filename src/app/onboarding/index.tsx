import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePersistence } from '@/features/persistence/context';
export default function OnboardingScreen() {
  const persistence = usePersistence();
  const [starting, setStarting] = useState(false);
  return (
    <ThemedView style={styles.container}>
      <View style={styles.intro}>
        <ThemedText type="title">Turn screenshots into actions.</ThemedText>
        <ThemedText themeColor="textSecondary">
          Recall helps you understand what you saved and choose what to do next.
        </ThemedText>
      </View>
      <View style={styles.points}>
        <Point text="Screenshots stay on your device unless you choose AI analysis." />
        <Point text="AI analysis may securely process a compressed screenshot and extracted text." />
        <Point text="Recall never takes an action or deletes a screenshot without your choice." />
      </View>
      <ActionButton
        label="Get Started"
        loadingLabel="Setting up Recall..."
        state={starting ? 'loading' : 'idle'}
        accessibilityLabel="Get started with Recall"
        onPress={() => {
          setStarting(true);
          void persistence
            .updateState((current) => ({ ...current, onboardingCompleted: true }))
            .then(() => router.replace('/(tabs)'))
            .finally(() => setStarting(false));
        }}
        style={styles.button}
      />
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 28 },
  intro: { gap: 10 },
  points: { gap: 14 },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { color: Colors.dark.accent, fontWeight: '700' },
  button: {
    alignSelf: 'flex-start',
    minWidth: 160,
  },
});

function Point({ text }: { text: string }) {
  return (
    <View style={styles.point}>
      <ThemedText style={styles.bullet}>•</ThemedText>
      <ThemedText style={{ flex: 1 }}>{text}</ThemedText>
    </View>
  );
}
