/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#F7FAFF',
    background: '#080B10',
    backgroundElement: '#121821',
    backgroundSelected: '#18283B',
    textSecondary: '#AAB4C2',
    accent: '#3C8DFF',
    accentMuted: '#17345A',
    border: '#263241',
    success: '#42C987',
    danger: '#FF6B72',
    overlay: 'rgba(2, 5, 9, 0.88)',
  },
  dark: {
    text: '#F7FAFF',
    background: '#080B10',
    backgroundElement: '#121821',
    backgroundSelected: '#18283B',
    textSecondary: '#AAB4C2',
    accent: '#3C8DFF',
    accentMuted: '#17345A',
    border: '#263241',
    success: '#42C987',
    danger: '#FF6B72',
    overlay: 'rgba(2, 5, 9, 0.88)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 6,
  medium: 8,
  large: 8,
} as const;

export const Layout = {
  screenPadding: 20,
  sectionGap: 16,
  minimumTouchTarget: 48,
} as const;

export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.24,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  }),
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
