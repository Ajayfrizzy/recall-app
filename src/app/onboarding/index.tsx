import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePersistence } from '@/features/persistence/context';
export default function OnboardingScreen() {
  const persistence = usePersistence();
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Get started with Recall"
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
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 28 },
  intro: { gap: 10 },
  points: { gap: 14 },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { color: '#208AEF', fontWeight: '700' },
  button: {
    backgroundColor: '#208AEF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});

function Point({ text }: { text: string }) {
  return (
    <View style={styles.point}>
      <ThemedText style={styles.bullet}>•</ThemedText>
      <ThemedText style={{ flex: 1 }}>{text}</ThemedText>
    </View>
  );
}
