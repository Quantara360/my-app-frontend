import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useColorScheme } from "@/hooks/use-color-scheme";
import { rs } from "@/constants/theme";

export function BackgroundPattern() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  // useWindowDimensions (not Dimensions.get) so this re-renders on rotation/
  // resize - rs() itself reads the current width fresh on every call, the
  // same fix already applied to ThemedText's title/subtitle sizing.
  useWindowDimensions();

  // Base size (280/180) is the approved "normal" size from the last round -
  // rs() scales it proportionally for genuinely small/large screens, clamped
  // fairly tight so it can't balloon back up to the oversized 600px version
  // that was tried and rejected, or shrink to nothing on a tiny screen.
  const largeSize = rs(280, 220, 340);
  const smallSize = rs(180, 140, 220);

  return (
    <>
      <View style={[styles.background, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]} />
      <View
        style={[
          styles.circle,
          {
            width: largeSize,
            height: largeSize,
            borderRadius: largeSize / 2,
            top: -largeSize * 0.57,
            right: -largeSize * 0.32,
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.65)",
          },
        ]}
      />
      <View
        style={[
          styles.circle,
          {
            width: smallSize,
            height: smallSize,
            borderRadius: smallSize / 2,
            bottom: -smallSize * 0.56,
            left: -smallSize * 0.44,
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255, 255, 255, 0.5)",
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    margin: 0,
    padding: 0,
  },
  circle: {
    position: "absolute",
    margin: 0,
    padding: 0,
  },
});
