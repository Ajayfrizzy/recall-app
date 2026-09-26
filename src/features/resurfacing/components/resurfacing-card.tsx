import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { FadeInView } from '@/components/motion';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
              variant="ghost"
              compact
              preserveLabelWidth
              style={styles.snoozeAction}
              onPress={() => {
                setActiveAction('snooze');
                void onSnooze().finally(() => setActiveAction(undefined));
              }}
            />
            <ActionButton
              label="Dismiss"
              loadingLabel="Dismissing..."
              state={activeAction === 'dismiss' ? 'loading' : activeAction ? 'disabled' : 'idle'}
              variant="ghost"
              compact
              preserveLabelWidth
              style={styles.dismissAction}
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
  primaryActions: { flexDirection: 'row', alignItems: 'flex-start' },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 8,
  },
  action: { alignSelf: 'flex-start' },
  snoozeAction: { alignSelf: 'flex-start', minWidth: 120 },
  dismissAction: { alignSelf: 'flex-start', minWidth: 88 },
});
