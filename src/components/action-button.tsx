import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Layout, Radius } from '@/constants/theme';
import { ThemedText } from './themed-text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ActionButtonState = 'idle' | 'loading' | 'success' | 'disabled';

export function ActionButton({
  label,
  loadingLabel,
  successLabel,
  state = 'idle',
  variant = 'primary',
  compact = false,
  onPress,
  accessibilityLabel,
  preserveLabelWidth = false,
  style,
}: {
  label: string;
  loadingLabel?: string;
  successLabel?: string;
  state?: ActionButtonState;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  compact?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  preserveLabelWidth?: boolean;
  style?: ViewStyle;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const disabled = state === 'loading' || state === 'success' || state === 'disabled';
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const visibleLabel =
    state === 'loading'
      ? (loadingLabel ?? label)
      : state === 'success'
        ? (successLabel ?? label)
        : label;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? visibleLabel}
      accessibilityState={{ disabled, busy: state === 'loading' }}
      accessibilityLiveRegion={state === 'loading' || state === 'success' ? 'polite' : 'none'}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        if (!reduceMotion && !disabled) scale.value = withTiming(0.98, { duration: 90 });
      }}
      onPressOut={() => {
        if (!reduceMotion) scale.value = withTiming(1, { duration: 120 });
      }}
      style={[
        styles.base,
        compact && styles.compact,
        styles[variant],
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      <View style={styles.content}>
        {state === 'loading' ? (
          <ActivityIndicator
            color={variant === 'primary' || variant === 'danger' ? '#fff' : Colors.dark.accent}
          />
        ) : null}
        {state === 'success' ? (
          <ThemedText style={[styles.icon, variant === 'primary' && styles.primaryText]}>
            ✓
          </ThemedText>
        ) : null}
        <ThemedText
          type="smallBold"
          numberOfLines={2}
          maxFontSizeMultiplier={1.5}
          style={[
            styles.label,
            preserveLabelWidth && styles.preserveLabelWidth,
            variant === 'primary' || variant === 'danger' ? styles.primaryText : undefined,
          ]}
        >
          {visibleLabel}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexShrink: 0,
    maxWidth: '100%',
    minHeight: Layout.minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  compact: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 8 },
  content: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: { flexShrink: 1, textAlign: 'center' },
  preserveLabelWidth: { flexShrink: 0 },
  primary: { backgroundColor: Colors.dark.accent },
  secondary: { backgroundColor: Colors.dark.backgroundElement, borderColor: Colors.dark.border },
  danger: { backgroundColor: '#B93842' },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.48 },
  primaryText: { color: '#fff' },
  icon: { lineHeight: 20 },
});
