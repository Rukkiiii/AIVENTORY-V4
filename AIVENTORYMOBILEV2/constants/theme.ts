/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// App brand colors
const primaryLight = '#2E3A8C';
const successLight = '#06D6A0';
const warningLight = '#FFD166';
const dangerLight = '#FF6B6B';
const textPrimaryLight = '#1a1a1a';
const textSecondaryLight = '#333333';
const textTertiaryLight = '#666666';
const backgroundLight = '#f0f2f5';
const cardBackgroundLight = '#ffffff';
const borderColorLight = '#eee';

const primaryDark = '#818cf8';
const successDark = '#22c55e';
const warningDark = '#fbbf24';
const dangerDark = '#f97373';
const textPrimaryDark = '#f9fafb';
const textSecondaryDark = '#e5e7eb';
const textTertiaryDark = '#9ca3af';
const backgroundDark = '#020617';
const cardBackgroundDark = '#0f172a';
const borderColorDark = '#1e293b';

export const Colors = {
  light: {
    text: textPrimaryLight,
    textSecondary: textSecondaryLight,
    textTertiary: textTertiaryLight,
    background: backgroundLight,
    cardBackground: cardBackgroundLight,
    border: borderColorLight,
    tint: primaryLight,
    icon: '#687076',
    tabIconDefault: primaryLight,
    tabIconSelected: primaryLight,
    primary: primaryLight,
    success: successLight,
    warning: warningLight,
    danger: dangerLight,
  },
  dark: {
    text: textPrimaryDark,
    textSecondary: textSecondaryDark,
    textTertiary: textTertiaryDark,
    background: backgroundDark,
    cardBackground: cardBackgroundDark,
    border: borderColorDark,
    tint: primaryDark,
    icon: '#9ca3af',
    tabIconDefault: primaryDark,
    tabIconSelected: primaryDark,
    primary: primaryDark,
    success: successDark,
    warning: warningDark,
    danger: dangerDark,
  },
};

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
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});