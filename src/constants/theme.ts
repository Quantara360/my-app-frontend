/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
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

// Leftover from the Expo template's bottom tab navigator - this app uses
// <Slot /> at the root (see _layout.tsx), not <Tabs>, and has no bottom tab
// bar anywhere in the real navigation. The old 50/80px reserved for it was
// pure dead space at the bottom of nearly every screen, which was enough
// extra height to make otherwise-short screens (login, dashboard, etc.)
// scrollable when they shouldn't be. A small fixed gap is kept for visual
// breathing room only.
export const BottomTabInset = Spacing.three;
export const MaxContentWidth = 800;

// ─── Responsive Helpers ───────────────────────────────────────────────────────
// Base design width (iPhone 8 / SE 2nd gen). All sizes are expressed relative
// to this so they scale up/down proportionally on every device.
import { Dimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 375;

// Dimensions.get('window') was previously destructured once at module load
// (`const { width } = Dimensions.get('window')`), freezing rf()/rs()/vw()/
// isLandscape at whatever size the screen happened to be when the JS bundle
// first evaluated. That value never updated again for the life of the app -
// rotating the device, resizing the browser window (web/PWA), or entering
// split-screen/foldable states had no effect on any style computed from it.
// Reading Dimensions.get('window') fresh inside each function call fixes the
// value at the moment of use instead of at import time. Note this still
// isn't fully reactive on its own: a StyleSheet.create() at module scope
// only calls these once too, so a screen that wants to actually re-layout
// when the window resizes still needs React Native's useWindowDimensions()
// hook to trigger a re-render - these helpers just stop returning stale data
// when they ARE called from somewhere reactive (inline styles, a component
// body, useWindowDimensions-triggered re-renders, etc).
function scale(): number {
  return Dimensions.get('window').width / BASE_WIDTH;
}

/**
 * Responsive font size.
 * Pass the size you designed for at 375px; it will scale proportionally and
 * be clamped between `min` and `max` so it stays readable on very small/large
 * screens.
 */
export function rf(size: number, min?: number, max?: number): number {
  const scaled = Math.round(PixelRatio.roundToNearestPixel(size * scale()));
  if (min !== undefined && scaled < min) return min;
  if (max !== undefined && scaled > max) return max;
  return scaled;
}

/**
 * Responsive size (margins, padding, dimensions).
 * Same scaling as rf() but typically used for non-font measurements.
 */
export function rs(size: number, min?: number, max?: number): number {
  const scaled = Math.round(size * scale());
  if (min !== undefined && scaled < min) return min;
  if (max !== undefined && scaled > max) return max;
  return scaled;
}

/** True if the current device is in landscape orientation */
export function isLandscape(): boolean {
  const { width, height } = Dimensions.get('window');
  return width > height;
}

/** Shorthand for a percentage of screen width */
export const vw = (pct: number) => (Dimensions.get('window').width * pct) / 100;

