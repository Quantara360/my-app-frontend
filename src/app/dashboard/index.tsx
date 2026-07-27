import { useColorScheme } from "@/hooks/use-color-scheme";
import { Redirect, useRouter } from "expo-router";
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useEffect, useState } from "react";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { API_BASE_URL, getAuthHeaders } from "@/services/authService";
import { BottomTabInset, MaxContentWidth, Spacing, rf } from "@/constants/theme";
import { getWorkers } from "@/services/adminWorkersService";
import { getAssets } from "@/services/adminAssetsService";
import { getMachineries } from "@/services/adminMachineriesService";
import { getChemicals } from "@/services/adminChemicalsService";
import { getApprovals } from "@/services/adminApprovalsService";
import { getAttendances } from "@/services/adminAttendancesService";

interface WorksiteTile {
  id: number;
  name: string;
  description: string;
  logo?: string;
}

const officeStaffTiles = [
  { id: "workers", title: "Workers", route: "/workers", color: "#FFD6D6", icon: "\u{1F477}" },
  { id: "assets", title: "Assets", route: "/assets", color: "#D6EAFF", icon: "\u{1F4E6}" },
  { id: "machineries", title: "Machineries", route: "/machineries", color: "#D6FFE4", icon: "\u2699\uFE0F" },
  { id: "chemicals", title: "Chemicals", route: "/chemicals", color: "#FFF3D6", icon: "\u{1F9EA}" },
  { id: "approvals", title: "Approvals", route: "/approvals", color: "#EDD6FF", icon: "\u2705" },
  { id: "salaries", title: "Salaries", route: "/salaries", color: "#D6FFF9", icon: "\u{1F4B5}" },
  { id: "other-payments", title: "Peticash", route: "/other-payments", color: "#FFE8D6", icon: "\u{1F4B0}" },
  { id: "attendances", title: "Attendances", route: "/attendances", color: "#D6F0FF", icon: "\u{1F465}" },
  { id: "peticash", title: "Accounts", route: "/accounts", color: "#F5FFD6", icon: "\u{1F3E6}" },
  { id: "template", title: "Template", route: "/template", color: "#FFD6F0", icon: "\u{1F4CB}" },
  { id: "bonds", title: "Bonds", route: "/bonds", color: "#D6D6FF", icon: "\u{1F4C4}" },
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

  // --- Office Staff tile counts ---
  const [tileCounts, setTileCounts] = useState<Record<string, number | null>>({
    workers: null,
    assets: null,
    machineries: null,
    chemicals: null,
    approvals: null,
    attendances: null,
  });

  useEffect(() => {
    if (!token || user?.role !== "officeStaff") return;

    async function loadTileCounts() {
      try {
        const [workers, assets, machineries, chemicals, approvals, attendances] =
          await Promise.allSettled([
            getWorkers(),
            getAssets(),
            getMachineries(),
            getChemicals(),
            getApprovals(),
            getAttendances(),
          ]);

        // Today's date in YYYY-MM-DD (Sri Lanka offset)
        const now = new Date();
        const sriLankaDate = new Date(now.getTime() + 330 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        setTileCounts({
          workers:    workers.status    === 'fulfilled' ? workers.value.length    : null,
          assets:     assets.status     === 'fulfilled' ? assets.value.length     : null,
          machineries:machineries.status=== 'fulfilled' ? machineries.value.length: null,
          chemicals:  chemicals.status  === 'fulfilled' ? chemicals.value.length  : null,
          approvals:  approvals.status  === 'fulfilled'
            ? approvals.value.filter((a: any) => (a.status || '').toLowerCase() !== 'approved').length
            : null,
          attendances: attendances.status === 'fulfilled'
            ? attendances.value.filter((a: any) => a.date === sriLankaDate && !!a.marked_at).length
            : null,
        });
      } catch (err) {
        console.warn('[Dashboard] loadTileCounts error', err);
      }
    }

    loadTileCounts();
  }, [token, user?.role]);

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
          <ScrollView
            style={styles.staffScroll}
            contentContainerStyle={styles.staffScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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

            <View style={styles.staffGrid}>
                {[
                  officeStaffTiles.slice(0, 2),
                  officeStaffTiles.slice(2, 4),
                  officeStaffTiles.slice(4, 6),
                  officeStaffTiles.slice(6, 8),
                  officeStaffTiles.slice(8, 10),
                  officeStaffTiles.slice(10),
                ].map((rowTiles, rowIdx) => (
                  <View key={rowIdx} style={styles.staffCardsRow}>
                    {rowTiles.map((tile) => (
                      <Pressable
                        key={tile.id}
                        style={({ pressed }) => [
                          styles.staffCard,
                          rowTiles.length === 1 ? { flex: 1 } : {},
                          { backgroundColor: tile.color },
                          pressed && styles.staffCardPressed,
                        ]}
                        onPress={() => router.push(tile.route as any)}
                      >
                        <Text style={styles.staffCardIcon}>{tile.icon}</Text>
                        <Text style={[styles.staffCardTitle, { color: '#3D3D3D' }]}>
                          {tile.title}
                        </Text>
                        {tileCounts[tile.id] != null && (
                          <Text style={styles.staffCardValue}>
                            {tileCounts[tile.id]}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                ))}
              </View>
          </ScrollView>
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
  },
  staffScrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Platform.OS === 'ios' ? BottomTabInset + Spacing.four + 80 : BottomTabInset + Spacing.four,
    gap: Spacing.three,
    flexGrow: 1,
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
    fontSize: rf(22, 16, 22),
    fontWeight: "800",
    lineHeight: rf(28, 22, 28),
  },
  staffWelcome: {
    color: "#0F172A",
    fontSize: rf(24, 18, 28),
    fontWeight: "900",
    lineHeight: rf(32, 24, 36),
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
    backgroundColor: "#ffffffff",
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
    gap: Spacing.two,
    flexDirection: "column",
  },
  staffCardsRow: {
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "stretch",
  },
  staffCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  staffCardPressed: {
    opacity: 0.85,
  },
  staffCardIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  staffCardTitle: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  staffCardValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1d21",
    marginTop: 2,
  },
});
