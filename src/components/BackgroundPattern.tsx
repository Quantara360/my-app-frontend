import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColorScheme } from "@/hooks/use-color-scheme";

export function BackgroundPattern() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <>
      <View style={[styles.background, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]} />
      <View style={[styles.backgroundCircleLarge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.65)" }]} />
      <View style={[styles.backgroundCircleSmall, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255, 255, 255, 0.5)" }]} />
    </>
  );
}

// Sized to match the original per-screen circles (280/180 on web, 420/260 on
// native) that most screens carried before being unified onto this shared
// component - a 600/300 size was tried and was too large/dominant.
const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundCircleLarge: {
    position: "absolute",
    width: Platform.select({ web: 280, default: 420 }),
    height: Platform.select({ web: 280, default: 420 }),
    borderRadius: Platform.select({ web: 140, default: 210 }),
    top: -160,
    right: -90,
  },
  backgroundCircleSmall: {
    position: "absolute",
    width: Platform.select({ web: 180, default: 260 }),
    height: Platform.select({ web: 180, default: 260 }),
    borderRadius: Platform.select({ web: 90, default: 130 }),
    bottom: -100,
    left: -80,
  },
});
