import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing, MaxContentWidth, BottomTabInset, rf } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { useGoBack } from "@/hooks/use-go-back";

interface Site {
  id: number;
  name: string;
}

export default function SelectSites() {
  const goBack = useGoBack();
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { token } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // worksiteId is the real main worksite (e.g. 3 or 4)
  // hospitalId is the hospital within that worksite (used to filter sub-sites)
  const worksiteId = Array.isArray(params.worksiteId) ? params.worksiteId[0] : params.worksiteId;
  const hospitalId = Array.isArray(params.hospitalId) ? params.hospitalId[0] : (params.hospitalId || worksiteId);

  useEffect(() => {
    if (!token || !hospitalId) {
      setIsLoading(false);
      return;
    }
    async function loadSites() {
      try {
        const response = await fetch(`${API_BASE_URL}/sub-sites?hospital_id=${hospitalId}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const list: Site[] = Array.isArray(data) ? data : data.data || [];
          if (list.length === 0) {
            // No sub-sites for this hospital — skip straight to site-actions
            // Pass hospitalId so add-image can scope images per hospital
            router.replace({
              pathname: "/dashboard/site-actions",
              params: { worksiteId: worksiteId ?? "", hospitalId: hospitalId ?? "" },
            } as any);
            return;
          }
          setSites(list);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSites();
  }, [token, hospitalId]);

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]}>
      <View style={[styles.background, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]} />
      <View style={[styles.backgroundCircleLarge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.65)" }]} />
      <View style={[styles.backgroundCircleSmall, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255, 255, 255, 0.5)" }]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => goBack()}>
            <ThemedText style={styles.backText}>‹</ThemedText>
          </Pressable>
        </View>

        <View style={styles.heroSection}>
          <ThemedText type="title" style={styles.title}>
            Select Sites
          </ThemedText>
        </View>

        <ScrollView
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={styles.centerContent}
          showsVerticalScrollIndicator={false}
        >
          {sites.map((site) => (
            <Pressable
              key={site.id}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.cardPressed,
              ]}
              onPress={() => {
                router.push({
                  pathname: "/dashboard/site-actions",
                  params: { siteId: site.id, worksiteId, hospitalId, siteName: site.name },
                } as any);
              }}
            >
              <ThemedText type="subtitle" style={styles.cardText}>
                {site.name}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
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
    width: "100%",
    maxWidth: MaxContentWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    overflow: 'hidden',
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  backButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  backText: {
    fontWeight: "700",
    fontSize: 24,
    lineHeight: 24,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    width: "100%",
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: 12,
    flexDirection: "column",
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.four,
    paddingTop: Spacing.three,
  },
  title: {
    textAlign: "center",
    fontSize: rf(32, 22, 32),
    fontWeight: "700",
    marginBottom: Spacing.four,
  },
  listScroll: {
    flexGrow: 0,
    flexShrink: 1,
    width: "100%",
  },
  list: {
    gap: Spacing.three,
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  card: {
    borderRadius: 20,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardText: {
    textAlign: "center",
    fontSize: rf(22, 16, 26),
    lineHeight: rf(30, 22, 34),
    fontWeight: "600",
  },
});
