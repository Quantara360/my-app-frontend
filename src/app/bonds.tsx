import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, StyleSheet, View } from 'react-native';
import { BackgroundPattern } from '@/components/BackgroundPattern';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGoBack } from "@/hooks/use-go-back";

export default function BondsPage() {
  const goBack = useGoBack();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ThemedView style={styles.container}>
      <BackgroundPattern />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]} onPress={() => goBack()}>
            <ThemedText type="smallBold">←</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>Bonds</ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.tileGrid}>
            <Pressable style={styles.tile} onPress={() => router.push('/bid-bonds')}>
              <View style={[styles.imagePlaceholder, { backgroundColor: '#4f8ef7' }]} />
              <View style={styles.tileText}>
                <ThemedText type="subtitle" style={styles.tileTitle}>Bid Bonds</ThemedText>
              </View>
            </Pressable>

            <Pressable style={styles.tile} onPress={() => router.push('/performance-bonds')}>
              <View style={[styles.imagePlaceholder, { backgroundColor: '#28a745' }]} />
              <View style={styles.tileText}>
                <ThemedText type="subtitle" style={styles.tileTitle}>Performance Bonds</ThemedText>
              </View>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, paddingBottom: BottomTabInset, backgroundColor: 'transparent' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  backButton: { padding: Spacing.two, borderRadius: 16 },
  pageTitle: { flex: 1, textAlign: 'center', color: theme.text },
  card: { width: '100%', borderRadius: 28, padding: Spacing.four, backgroundColor: theme.backgroundElement, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  tileGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'stretch' },
  tile: { flexBasis: '48%', maxWidth: '48%', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing.four, paddingHorizontal: Spacing.three, backgroundColor: 'transparent', borderRadius: 24, borderWidth: 1, borderColor: theme.backgroundSelected, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3, marginBottom: Spacing.three },
  imagePlaceholder: { width: 48, height: 48, borderRadius: 14, marginBottom: Spacing.two },
  tileText: { alignItems: 'center' },
  tileTitle: { fontSize: 15, fontWeight: '700', color: theme.text, textAlign: 'center' },
});
