import { useColorScheme } from "@/hooks/use-color-scheme";
import { Redirect, useRouter } from "expo-router";
import {  Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useEffect, useState } from "react";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { API_BASE_URL } from "@/services/authService";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

interface WorksiteTile {
  id: number;
  name: string;
  description: string;
}

const officeStaffTiles = [
  {
    id: "workers",
    title: "Workers",
    route: "/workers",
  },
  {
    id: "assets",
    title: "Assets",
    route: "/assets",
  },
  {
    id: "machineries",
    title: "Machineries",
    route: "/machineries",
  },
  {
    id: "chemicals",
    title: "Chemicals",
    route: "/chemicals",
  },
  {
    id: "approvals",
    title: "Approvals",
    route: "/approvals",
  },
  {
    id: "salaries",
    title: "Salaries",
    route: "/salaries",
  },
  {
    id: "other-payments",
    title: "Payments",
    route: "/other-payments",
  },
  {
    id: "attendances",
    title: "Attendances",
    route: "/attendances",
  },
  {
    id: "peticash",
    title: "Peticash",
    route: "/peticash",
  },
  {
    id: "template",
    title: "Template",
    route: "/template",
  },
  {
    id: "bonds",
    title: "Bonds",
    route: "/bonds",
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, token, signOut } = useAuth();
  const [supervisorWorksites, setSupervisorWorksites] = useState<
    WorksiteTile[]
  >([]);

  useEffect(() => {
    if (!token || user?.role !== "supervisor") {
      return;
    }

    async function loadWorksites() {
      try {
        const response = await fetch(`${API_BASE_URL}/worksites`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Unable to load worksites");
        }

        const data = await response.json();
        setSupervisorWorksites(Array.isArray(data) ? data : data.data || []);
      } catch (error) {
        console.error(error);
      }
    }

    loadWorksites();
  }, [token, user?.role]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role === "admin") {
    return <Redirect href="/admin" />;
  }

  if (user.role === "officeStaff") {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.background, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]} />
        <View style={[styles.backgroundCircleLarge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.65)" }]} />
        <View style={[styles.backgroundCircleSmall, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255, 255, 255, 0.5)" }]} />
        
        <SafeAreaView style={styles.safeArea}>
          <View
            style={styles.staffScroll}
          >
            <View style={styles.staffHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text
                  style={[styles.staffGreeting, { color: theme.textSecondary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Hii Office Staff,
                </Text>
                <Text
                  style={[styles.staffWelcome, { color: theme.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Welcome!
                </Text>
              </View>
              <Pressable
                style={[
                  styles.staffMenuButton,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
                onPress={signOut}
              >
                <Text style={[styles.staffMenuText, { color: theme.text }]}>
                  Sign Out
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.staffPanel,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <View style={styles.staffGrid}>
                {officeStaffTiles.map((tile) => (
                  <Pressable
                    key={tile.id}
                    style={({ pressed }) => [
                      styles.staffCard,
                      tile.id === "bonds" ? { flexBasis: "100%", maxWidth: "100%" } : {},
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.backgroundSelected,
                      },
                      pressed && styles.staffCardPressed,
                    ]}
                    onPress={() => router.push(tile.route as any)}
                  >
                    <Text
                      style={[styles.staffCardTitle, { color: theme.text }]}
                    >
                      {tile.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.background, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]} />
      <View style={[styles.backgroundCircleLarge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.65)" }]} />
      <View style={[styles.backgroundCircleSmall, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255, 255, 255, 0.5)" }]} />

      <SafeAreaView style={styles.safeArea}>
        <View
          style={[styles.scrollContent, { flex: 1 }]}
        >
          <View style={styles.topRightControls}>
            <Pressable
              style={[
                styles.menuButton,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              onPress={signOut}
            >
              <Text style={[styles.menuText, { color: theme.text }]}>
                Sign Out
              </Text>
            </Pressable>
          </View>
          <View style={styles.headerCentered}>
            <ThemedText type="title" style={styles.titleCentered}>
              Select Worksite
            </ThemedText>
          </View>

          <View style={styles.tileGrid}>
            {supervisorWorksites.length === 0 ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.emptyText}
              >
                No worksites found for your account.
              </ThemedText>
            ) : (
              supervisorWorksites.map((worksite) => (
                <Pressable
                  key={worksite.id}
                  style={({ pressed }) => [
                    styles.tile,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.tilePressed,
                  ]}
                  onPress={() => {
                    // For main_site, go to select-hospitals
                    router.push(`/dashboard/select-hospitals?worksiteId=${worksite.id}`);
                  }}
                >
                  <View
                    style={[
                      styles.imagePlaceholder,
                      { backgroundColor: theme.background, overflow: 'hidden' },
                    ]}
                  >
                    {worksite.logo ? (
                      <Image 
                        source={{ uri: worksite.logo.startsWith('http') ? worksite.logo : `${API_BASE_URL.replace(/\/api$/, '')}${worksite.logo.includes('/') ? (worksite.logo.startsWith('/') ? worksite.logo : '/' + worksite.logo) : '/storage/worksites/' + worksite.logo}` }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <ThemedText
                        type="small"
                        themeColor="textSecondary"
                        style={styles.imageLabel}
                      >
                        Image
                      </ThemedText>
                    )}
                  </View>
                  <View style={styles.tileText}>
                    <ThemedText type="subtitle" style={styles.tileTitle}>
                      {worksite.name}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.tileSubtitle}
                    >
                      {worksite.description ?? "Open your worksite"}
                    </ThemedText>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row",
    overflow: 'hidden',
  },
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

  safeArea: {
    flex: 1,
    paddingTop: 60,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  scrollContent: {
    flex: 1,
    alignItems: "stretch",
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
    overflow: 'hidden',
  },
  staffScroll: {
    flex: 1,
    width: "100%",
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  topRightControls: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.two,
  },
  headerCentered: {
    width: "100%",
    alignItems: "center",
    marginBottom: Spacing.four,
    marginTop: Spacing.two,
  },
  titleCentered: {
    textAlign: "center",
  },
  menuButton: {
    marginLeft: 15,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    borderWidth: 1,
  },
  menuText: {
    fontWeight: "700",
  },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.two,
  },
  tileGrid: {
    gap: Spacing.three,
    flexDirection: "column",
    paddingBottom: Spacing.four,
  },
  tile: {
    flexDirection: "row",
    gap: Spacing.four,
    padding: Spacing.four,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    alignItems: "center",
    minHeight: 90,
  },
  tilePressed: {
    opacity: 0.85,
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  imageLabel: {
    textTransform: "uppercase",
  },
  tileText: {
    flex: 1,
  },
  tileTitle: {
    marginBottom: 6,
    flexShrink: 1,
  },
  tileSubtitle: {
    flexShrink: 1,
  },
  staffContainer: {
    flex: 1,
    backgroundColor: "#F4F4F5",
  },
  staffSafeArea: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    paddingTop: 60,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: 900,
  },
  staffHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.four,
  },
  staffGreeting: {
    color: "#475569",
    fontSize: Platform.select({ web: 22, default: 34 }),
    fontWeight: "800",
    lineHeight: Platform.select({ web: 28, default: 42 }),
  },
  staffWelcome: {
    color: "#0F172A",
    fontSize: Platform.select({ web: 24, default: 36 }),
    fontWeight: "900",
    lineHeight: Platform.select({ web: 32, default: 44 }),
  },
  staffMenuButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  staffMenuText: {
    color: "#0F172A",
    fontWeight: "700",
  },
  staffPanel: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 36,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  staffGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  staffCard: {
    flexBasis: "48%",
    maxWidth: "48%",
    minWidth: 140,
    minHeight: 90,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.two,
  },
  staffCardPressed: {
    opacity: 0.85,
  },
  staffCardTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
});
