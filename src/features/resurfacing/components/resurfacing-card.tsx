import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { FadeInView } from '@/components/motion';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { formatScheduledDateTime } from '@/features/upcoming/format';
import type { RecallResurfacingCard } from '../types';

export function ResurfacingCard({
  card,
  onDismiss,
  onSnooze,
}: {
  card: RecallResurfacingCard;
  onDismiss: () => Promise<void>;
  onSnooze: () => Promise<void>;
}) {
  const [activeAction, setActiveAction] = useState<'snooze' | 'dismiss'>();
  const { fontScale } = useWindowDimensions();
  const actionTextScale = Math.max(1, fontScale);
  const open = () => {
    if (card.action?.route) router.push(card.action.route as Href);
  };
  return (
    <FadeInView>
      <ThemedView type="backgroundElement" style={styles.card}>
        <Pressable
          accessibilityRole={card.action?.route ? 'button' : undefined}
          disabled={!card.action?.route}
          onPress={open}
          style={styles.copy}
        >
          <ThemedText type="smallBold">{card.title}</ThemedText>
          {card.scheduledAt !== undefined ? (
            <ThemedText type="smallBold" themeColor="accent">
              {formatScheduledDateTime(card.scheduledAt)}
            </ThemedText>
          ) : null}
          <ThemedText themeColor="textSecondary">{card.message}</ThemedText>
        </Pressable>
        <View style={styles.actionRows}>
          {card.action?.route ? (
            <View style={styles.primaryActions}>
              <ActionButton
                label={card.action.label}
                compact
                onPress={open}
                style={styles.action}
              />
            </View>
          ) : null}
          <View style={styles.secondaryActions}>
            <ActionButton
              label="Snooze 1 day"
              loadingLabel="Snoozing..."
              state={activeAction === 'snooze' ? 'loading' : activeAction ? 'disabled' : 'idle'}
              variant="secondary"
              compact
              preserveLabelWidth
              style={{ ...styles.snoozeAction, minWidth: 120 * actionTextScale }}
              onPress={() => {
                setActiveAction('snooze');
                void onSnooze().finally(() => setActiveAction(undefined));
              }}
            />
            <ActionButton
              label="Dismiss"
              loadingLabel="Dismissing..."
              state={activeAction === 'dismiss' ? 'loading' : activeAction ? 'disabled' : 'idle'}
              variant="outlined"
              compact
              preserveLabelWidth
              style={{ ...styles.dismissAction, minWidth: 88 * actionTextScale }}
              onPress={() => {
                setActiveAction('dismiss');
                void onDismiss().finally(() => setActiveAction(undefined));
              }}
            />
          </View>
        </View>
      </ThemedView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 8, gap: 12 },
  copy: { gap: 4 },
  actionRows: { flexDirection: 'column', alignItems: 'flex-start', gap: 8 },
  primaryActions: { alignSelf: 'stretch' },
  secondaryActions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 8,
  },
  action: { alignSelf: 'stretch', minHeight: 48 },
  snoozeAction: {
    flexGrow: 1,
    alignSelf: 'flex-start',
    minWidth: 120,
    minHeight: 48,
    backgroundColor: Colors.dark.backgroundSelected,
    borderColor: Colors.dark.textSecondary,
  },
  dismissAction: { alignSelf: 'flex-start', flexGrow: 1, minWidth: 88, minHeight: 48 },
});
