import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { BackgroundPattern } from '@/components/BackgroundPattern';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGoBack } from '@/hooks/use-go-back';

export default function AccountsPage() {
  const goBack = useGoBack();
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#F1E7DF' }]}>
      <BackgroundPattern />
      <SafeAreaView style={styles.safeArea}>
        {/* Center wrapper */}
        <View style={styles.centerWrapper}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable
              style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]}
              onPress={() => goBack()}
            >
              <Text style={{ fontSize: 20, color: '#555', fontWeight: 'bold' }}>{'←'}</Text>
            </Pressable>
            <ThemedText type="title" style={styles.pageTitle}>
              Accounts
            </ThemedText>
          </View>

          {/* Cards */}
          {/* Cash in Hand */}
          <Pressable
            style={[styles.tileButton, { backgroundColor: '#c0392b' }]}
            onPress={() => router.push('/cash-in-hand')}
          >
            <Text style={styles.tileText}>Cash in Hand</Text>
          </Pressable>

          {/* Bank */}
          <Pressable
            style={[styles.tileButton, { backgroundColor: '#a89080' }]}
            onPress={() => router.push('/bank')}
          >
            <Text style={styles.tileText}>Bank</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.four,
      paddingBottom: BottomTabInset,
      backgroundColor: 'transparent',
    },
    safeArea: {
      flex: 1,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
      justifyContent: 'center',
    },
    centerWrapper: {
      gap: Spacing.three,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    backButton: {
      padding: Spacing.two,
      borderRadius: 14,
    },
    pageTitle: {
      flex: 1,
      textAlign: 'center',
      color: theme.text,
    },
    card: {
      borderRadius: 30,
      padding: Spacing.four,
      gap: Spacing.three,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
      backgroundColor: theme.backgroundElement,
    },
    tileButton: {
      width: '100%',
      paddingVertical: 22,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
  });
