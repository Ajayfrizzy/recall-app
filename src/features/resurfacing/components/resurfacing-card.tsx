import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { RecallResurfacingCard } from '../types';

export function ResurfacingCard({
  card,
  onDismiss,
  onSnooze,
}: {
  card: RecallResurfacingCard;
  onDismiss: () => void;
  onSnooze: () => void;
}) {
  const open = () => {
    if (card.action?.route) router.push(card.action.route as Href);
  };
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable
        accessibilityRole={card.action?.route ? 'button' : undefined}
        disabled={!card.action?.route}
        onPress={open}
        style={styles.copy}
      >
        <ThemedText type="smallBold">{card.title}</ThemedText>
        <ThemedText themeColor="textSecondary">{card.message}</ThemedText>
      </Pressable>
      <View style={styles.actions}>
        {card.action?.route ? (
          <Pressable accessibilityRole="button" onPress={open} style={styles.primaryAction}>
            <ThemedText type="smallBold" style={styles.primaryActionText}>
              {card.action.label}
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onSnooze} style={styles.secondaryAction}>
          <ThemedText type="smallBold">Snooze 1 day</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.secondaryAction}>
          <ThemedText type="smallBold">Dismiss</ThemedText>
        </Pressable>
      </View>
      {__DEV__ ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.debug}>
          {card.id} · p{card.priority}
          {card.bucket ? ` · ${card.bucket}` : ''}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 10, gap: 12 },
  copy: { gap: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryAction: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#208AEF',
  },
  primaryActionText: { color: '#fff' },
  secondaryAction: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  debug: { fontSize: 11 },
});
