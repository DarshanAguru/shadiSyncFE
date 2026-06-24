/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#5D0921', // Deep luxurious burgundy/maroon for high-end wedding text
    background: '#FAF5F2', // Warm paper-like ivory background
    backgroundElement: '#FFFFFF', // Clean white card background
    backgroundSelected: '#F5E6E4', // Soft velvet cream blush for active items
    textSecondary: '#4E393B', // High-contrast plummy dark gray for readable secondary text
    border: '#E6D5D1', // Soft warm rose-gold border color
  },
  dark: {
    text: '#FFEBEF', // Soft shimmering rose white for high readability
    background: '#14080B', // Even darker midnight cherry for amazing OLED contrast
    backgroundElement: '#241417', // Rich velvet wine card background
    backgroundSelected: '#3D1C22', // Accented deep rose selection highlight
    textSecondary: '#D6C0C3', // Highly legible light gold-rose secondary text
    border: '#3A1E24', // Deep wine border color for dark mode
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
    sans: 'normal',
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

export const BottomTabInset = 100;
export const MaxContentWidth = 800;
