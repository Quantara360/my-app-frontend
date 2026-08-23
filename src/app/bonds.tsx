import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, StyleSheet, View, Platform, Image } from 'react-native';
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
    <ThemedView style={[styles.container, { backgroundColor: '#F1E7DF' }]}>
      <BackgroundPattern />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]} onPress={() => goBack()}>
            <ThemedText type="smallBold">←</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>Bonds</ThemedText>
        </View>

        <View style={styles.card}>
          <View style={styles.tileGrid}>
            <Pressable style={styles.tile} onPress={() => router.push('/bid-bonds')}>
              <View style={{ width: '100%', alignItems: 'center', marginBottom: Spacing.two, marginTop: 16 }}>
                <Image
                  source={require('../../assets/images/Bid Bond.png')}
                  style={styles.imagePlaceholder}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.tileText}>
                <ThemedText type="subtitle" style={styles.tileTitle}>Bid Bonds</ThemedText>
              </View>
            </Pressable>

            <Pressable style={styles.tile} onPress={() => router.push('/performance-bonds')}>
              <View style={{ width: '100%', alignItems: 'center', marginBottom: Spacing.two, marginTop: 16 }}>
                <Image
                  source={require('../../assets/images/Performance Bond.png')}
                  style={styles.imagePlaceholder}
                  resizeMode="contain"
                />
              </View>
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
  container: { flex: 1, padding: Spacing.four, paddingTop: 80, paddingBottom: BottomTabInset, backgroundColor: 'transparent', overflow: 'hidden' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  backButton: { padding: Spacing.two, borderRadius: 16 },
  pageTitle: { flex: 1, textAlign: 'center', color: theme.text },
  card: { width: '100%', borderRadius: 0, padding: Spacing.four, backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  tileGrid: { width: '100%', flexDirection: 'column', gap: Spacing.three },
  // No border/shadow here on purpose - those made each tile read as its
  // own separate white box sitting on top of the shared white `card`
  // background (a border + drop shadow are enough to imply a distinct
  // panel even with backgroundColor:'transparent' underneath). Just the
  // icon + label now, separated by tileGrid's gap.
  tile: { width: '100%', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing.four, paddingHorizontal: Spacing.three, backgroundColor: 'transparent', minHeight: 130 },
  imagePlaceholder: { width: 90, height: 90, borderRadius: 0, marginBottom: Spacing.two, alignSelf: 'center' },
  tileText: { alignItems: 'center', width: '100%' },
  tileTitle: { fontSize: 15, fontWeight: '700', color: theme.text, textAlign: 'center', flexWrap: 'wrap' },
});
