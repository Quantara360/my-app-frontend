import { Platform, StyleSheet, Text, useWindowDimensions, type TextProps } from 'react-native';
import { useMemo } from 'react';

import { Fonts, rf, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  // rf() itself reads the current window width fresh on every call - the
  // staleness was entirely in title/subtitle living in the module-level
  // `styles` object below, which StyleSheet.create() only ever evaluates
  // once for the lifetime of the JS bundle. That freezes them at whatever
  // size the screen happened to be on first load (rotating the device,
  // resizing a desktop/PWA window, or a foldable unfolding never updated
  // them again). useWindowDimensions() makes this component itself
  // re-render on those changes; recomputing the rf()-derived sizes here
  // (not in the static `styles` object) picks up the fresh value each time.
  const { width } = useWindowDimensions();
  const responsiveStyle = useMemo(() => {
    if (type === 'title') {
      return { fontSize: rf(48, 32, 48), fontWeight: 600 as const, lineHeight: rf(52, 36, 52) };
    }
    if (type === 'subtitle') {
      return { fontSize: rf(32, 24, 32), lineHeight: rf(44, 32, 44), fontWeight: 600 as const };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, width]);

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        responsiveStyle,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
