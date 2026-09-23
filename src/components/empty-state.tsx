import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.message}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 16, gap: 6 },
  message: { textAlign: 'center' },
});
