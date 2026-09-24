import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { FadeInView } from '@/components/motion';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Layout, MaxContentWidth, Radius } from '@/constants/theme';
import { usePersistence } from '@/features/persistence/context';

const photoIcon = {
  ios: 'photo',
  android: 'image',
  web: 'image',
} as const;

const arrowIcon = {
  ios: 'arrow.down',
  android: 'arrow_downward',
  web: 'arrow_downward',
} as const;

const calendarIcon = {
  ios: 'calendar',
  android: 'calendar_month',
  web: 'calendar_month',
} as const;

export default function OnboardingScreen() {
  const persistence = usePersistence();
  const [starting, setStarting] = useState(false);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
            <FadeInView>
              <RecallJourney />
            </FadeInView>

            <FadeInView>
              <View style={styles.copy}>
                <ThemedText type="title" style={styles.title}>
                  Your screenshots, finally useful.
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.description}>
                  Recall finds the important details in your screenshots and helps you turn them
                  into reminders, saved items, events, and organized collections.
                </ThemedText>
              </View>
            </FadeInView>

            <View style={styles.footer}>
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
              <ThemedText type="small" themeColor="textSecondary" style={styles.privacy}>
                Your screenshots stay on your device unless you choose to use AI analysis.
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function RecallJourney() {
  return (
    <View
      style={styles.journey}
      accessible
      accessibilityLabel="A screenshot for a Design Meetup becomes a detected event with an Add to Calendar action"
    >
      <View style={styles.sourceCard}>
        <View style={styles.sourceHeader}>
          <View style={styles.sourceIcon}>
            <SymbolView name={photoIcon} tintColor={Colors.dark.text} size={18} />
          </View>
          <ThemedText type="smallBold" style={styles.sourceLabel}>
            SCREENSHOT
          </ThemedText>
        </View>
        <View style={styles.poster}>
          <ThemedText type="smallBold" style={styles.posterEyebrow}>
            CREATIVE COMMUNITY
          </ThemedText>
          <ThemedText style={styles.posterTitle}>Design Meetup</ThemedText>
          <ThemedText type="small" style={styles.posterDate}>
            SEP 28 / 6:30 PM
          </ThemedText>
        </View>
      </View>

      <View style={styles.connector}>
        <View style={styles.connectorLine} />
        <View style={styles.connectorIcon}>
          <SymbolView name={arrowIcon} tintColor={Colors.dark.accent} size={18} />
        </View>
        <ThemedText type="smallBold" style={styles.connectorLabel}>
          RECALL UNDERSTANDS
        </ThemedText>
        <View style={styles.connectorLine} />
      </View>

      <View style={styles.resultCard}>
        <View style={styles.resultIcon}>
          <SymbolView name={calendarIcon} tintColor={Colors.dark.success} size={22} />
        </View>
        <View style={styles.resultDetails}>
          <ThemedText type="smallBold" style={styles.detected}>
            EVENT DETECTED
          </ThemedText>
          <ThemedText type="smallBold" style={styles.eventTitle}>
            Design Meetup
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            September 28, 2026
          </ThemedText>
        </View>
        <View style={styles.actionPill}>
          <ThemedText type="smallBold" style={styles.actionText}>
            Add to Calendar
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 16,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  journey: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  sourceCard: {
    width: '82%',
    maxWidth: 360,
    alignSelf: 'flex-start',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.large,
    backgroundColor: Colors.dark.backgroundElement,
  },
  sourceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sourceIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    backgroundColor: '#2A303A',
  },
  sourceLabel: { color: Colors.dark.textSecondary, fontSize: 11 },
  poster: {
    minHeight: 116,
    justifyContent: 'flex-end',
    padding: 14,
    borderRadius: Radius.small,
    backgroundColor: '#23364D',
    borderLeftWidth: 4,
    borderLeftColor: '#FFB95C',
  },
  posterEyebrow: { color: '#FFCA84', fontSize: 10 },
  posterTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', marginTop: 2 },
  posterDate: { color: Colors.dark.text, marginTop: 8 },
  connector: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  connectorLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.dark.border },
  connectorIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.dark.accentMuted,
  },
  connectorLabel: { color: Colors.dark.accent, fontSize: 10 },
  resultCard: {
    width: '90%',
    maxWidth: 420,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#275340',
    borderRadius: Radius.large,
    backgroundColor: '#111D19',
  },
  resultIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
    backgroundColor: '#183829',
  },
  resultDetails: { flex: 1, minWidth: 150 },
  detected: { color: Colors.dark.success, fontSize: 10 },
  eventTitle: { marginTop: 1 },
  actionPill: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: Radius.small,
    backgroundColor: Colors.dark.accent,
  },
  actionText: { color: '#FFFFFF', fontSize: 12 },
  copy: { gap: 10, maxWidth: 600 },
  title: { fontSize: 36, lineHeight: 42 },
  description: { maxWidth: 580 },
  footer: { gap: 12, paddingTop: 4 },
  button: { width: '100%', minHeight: 54 },
  privacy: { textAlign: 'center', paddingHorizontal: 8 },
});
