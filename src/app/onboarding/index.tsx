import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePersistence } from '@/features/persistence/context';
export default function OnboardingScreen() {
  const persistence = usePersistence();
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Your screenshots are unfinished intentions.</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          await persistence.updateState((current) => ({ ...current, onboardingCompleted: true }));
          router.replace('/(tabs)');
        }}
        style={styles.button}
      >
        <ThemedText style={styles.buttonText}>Get Started</ThemedText>
      </Pressable>
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 32 },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
