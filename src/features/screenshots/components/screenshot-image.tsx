import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import {
  createScreenshotImageState,
  screenshotImageSourceKey,
  transitionScreenshotImageState,
} from '../image-state';

const unavailableIcon = {
  ios: 'photo.badge.exclamationmark',
  android: 'broken_image',
  web: 'broken_image',
} as const;

export function ScreenshotImage({
  uri,
  screenshotId,
  accessibilityLabel,
  style,
  compact = false,
}: {
  uri: string | null | undefined;
  screenshotId: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const sourceKey = screenshotImageSourceKey(uri);
  const [state, setState] = useState(() => createScreenshotImageState(uri));
  const visibleState = state.sourceKey === sourceKey ? state : createScreenshotImageState(uri);

  return (
    <View style={[styles.container, style]}>
      {sourceKey ? (
        <Image
          source={{ uri: sourceKey }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          recyclingKey={`${screenshotId}:${sourceKey}`}
          transition={120}
          accessibilityLabel={accessibilityLabel}
          onLoadStart={() => setState(transitionScreenshotImageState(uri, 'load_start'))}
          onLoad={() => setState(transitionScreenshotImageState(uri, 'load'))}
          onError={() => setState(transitionScreenshotImageState(uri, 'error'))}
        />
      ) : null}

      {visibleState.status === 'loading' ? (
        <View
          accessible
          accessibilityRole="image"
          style={styles.state}
          accessibilityLabel="Loading screenshot preview"
        >
          <ActivityIndicator color={Colors.dark.accent} size={compact ? 'small' : 'large'} />
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={2}
            maxFontSizeMultiplier={1.4}
            style={styles.message}
          >
            Loading preview
          </ThemedText>
        </View>
      ) : null}

      {visibleState.status === 'error' || visibleState.status === 'unavailable' ? (
        <View
          accessible
          accessibilityRole="image"
          style={styles.state}
          accessibilityLabel={
            visibleState.status === 'error'
              ? 'Screenshot preview could not be loaded'
              : 'Screenshot is no longer available'
          }
        >
          <SymbolView
            name={unavailableIcon}
            tintColor={Colors.dark.textSecondary}
            size={compact ? 24 : 34}
          />
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={2}
            maxFontSizeMultiplier={1.4}
            style={styles.message}
          >
            {visibleState.status === 'error' ? 'Preview unavailable' : 'Image unavailable'}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#1A232D',
  },
  state: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 6,
    backgroundColor: '#1A232D',
  },
  message: { textAlign: 'center' },
});
