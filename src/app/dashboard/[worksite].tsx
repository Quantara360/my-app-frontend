import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { useEffect, useState } from "react";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { API_BASE_URL } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";

const worksiteActions = [
  { id: "attendance", title: "Mark Attendance" },
  { id: "add-image", title: "Add image" },
];

export default function WorksitePage() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const { token } = useAuth();
  const worksiteId = Number(params.worksite);
  const [worksite, setWorksite] = useState<{ id: number; name: string; description?: string } | null>(null);

  useEffect(() => {
    if (!token || !worksiteId) {
      return;
    }

    async function loadWorksite() {
      try {
        const response = await fetch(`${API_BASE_URL}/worksites/${worksiteId}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Unable to load worksite");
        }

        setWorksite(await response.json());
      } catch (error) {
        console.error(error);
      }
    }

    loadWorksite();
  }, [token, worksiteId]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backText}>Back</ThemedText>
          </Pressable>
        </View>
        <View style={styles.heroSection}>
          <ThemedText type="title" style={styles.title}>
            {worksite?.name ?? "Worksite"}
          </ThemedText>
        </View>

        <View style={styles.tileGrid}>
          {worksite ? (
            worksiteActions.map((action) => (
              <Pressable
                key={action.id}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.tilePressed,
                ]}
                onPress={() => {
                  if (action.id === "attendance") {
                    router.push({ pathname: "/mark-attendance", params: { worksiteId } } as any);
                    return;
                  }
                  // Action behavior can be added later.
                }}
              >
                <View style={styles.imagePlaceholder}>
                  <ThemedText type="small" style={[styles.imageLabel, { color: theme.textSecondary }]}>
                    Image
                  </ThemedText>
                </View>
                <View style={styles.tileContent}>
                  <ThemedText type="subtitle" style={styles.tileTitle}>
                    {action.title}
                  </ThemedText>
                </View>
              </Pressable>
            ))
          ) : (
            <ThemedText type="small" style={styles.emptyText}>
              Loading worksite...
            </ThemedText>
          )}
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
  },
  safeArea: {
    flex: 1,
    width: "100%",
    paddingHorizontal: Spacing.four,
    paddingTop: 60,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
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
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
  },
  tileGrid: {
    width: "100%",
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  tile: {
    flexDirection: "row",
    gap: Spacing.four,
    borderRadius: 28,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  tilePressed: {
    opacity: 0.85,
  },
  imagePlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageLabel: {
    color: "#60646C",
    textTransform: "uppercase",
  },
  tileContent: {
    flex: 1,
    alignItems: "flex-start",
  },
  tileTitle: {
    textAlign: "left",
  },
});
