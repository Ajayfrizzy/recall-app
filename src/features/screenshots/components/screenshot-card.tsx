import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius } from '@/constants/theme';
import type { RecallScreenshot, ScreenshotStatus } from '../types';

type Props = {
  screenshot: RecallScreenshot;
  onPress: () => void;
  onStatus: (status: ScreenshotStatus) => void;
};

export function ScreenshotCard({ screenshot, onPress, onStatus }: Props) {
  const date = screenshot.creationTime
    ? new Date(screenshot.creationTime * 1000).toLocaleDateString()
    : null;
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${screenshot.filename ?? 'screenshot'}`}
        onPress={onPress}
        style={styles.preview}
      >
        <Image
          source={{ uri: screenshot.uri }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={date ? `Screenshot from ${date}` : 'Screenshot'}
        />
        <View style={styles.meta}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {screenshot.filename ?? 'Screenshot'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {date ?? `${screenshot.width} x ${screenshot.height}`}
          </ThemedText>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Keep screenshot"
          onPress={() => onStatus('kept')}
          style={styles.action}
        >
          <ThemedText type="linkPrimary">Keep</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ignore screenshot"
          onPress={() => onStatus('ignored')}
          style={styles.action}
        >
          <ThemedText type="linkPrimary">Ignore</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark screenshot processed"
          onPress={() => onStatus('processed')}
          style={styles.action}
        >
          <ThemedText type="linkPrimary">Processed</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    overflow: 'hidden',
    backgroundColor: Colors.dark.backgroundElement,
    marginBottom: 16,
  },
  preview: { flexDirection: 'row', minHeight: 112 },
  image: { width: 112, height: 112, backgroundColor: Colors.dark.backgroundSelected },
  meta: { flex: 1, justifyContent: 'center', padding: 12, gap: 4 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
  },
  action: { minHeight: 44, minWidth: 72, alignItems: 'center', justifyContent: 'center' },
});
