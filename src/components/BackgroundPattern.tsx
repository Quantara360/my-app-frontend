import React from 'react';
import { StyleSheet, View } from 'react-native';
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

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundCircleLarge: {
    position: "absolute",
    width: 600,
    height: 600,
    borderRadius: 300,
    top: -150,
    right: -200,
  },
  backgroundCircleSmall: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    bottom: -50,
    left: -100,
  },
});
