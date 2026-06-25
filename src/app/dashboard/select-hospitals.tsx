import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing, MaxContentWidth, BottomTabInset } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { useGoBack } from "@/hooks/use-go-back";

interface Hospital {
  id: number;
  name: string;
}

export default function SelectHospitals() {
  const goBack = useGoBack();
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const { token } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const worksiteId = Array.isArray(params.worksiteId)
    ? params.worksiteId[0]
    : params.worksiteId;

  useEffect(() => {
    if (!token || !worksiteId) return;
    async function loadHospitals() {
      try {
        const response = await fetch(`${API_BASE_URL}/hospitals?worksite_id=${worksiteId}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setHospitals(Array.isArray(data) ? data : data.data || []);
        }
      } catch (error) {
        console.error(error);
      }
    }
    loadHospitals();
  }, [token, worksiteId]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => goBack()}>
            <ThemedText style={styles.backText}>‹</ThemedText>
          </Pressable>
        </View>

        <View style={styles.centerContent}>
          <View style={styles.heroSection}>
            <ThemedText type="title" style={styles.title}>
              Select Hospitals
            </ThemedText>
          </View>

          <View style={styles.list}>
            {hospitals.map((h) => (
              <Pressable
                key={h.id}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.cardPressed,
                ]}
                onPress={() => {
                  // Pass the REAL worksite ID AND the hospital ID separately
                  // so the attendance screen always uses the correct worksite
                  router.push(
                    `/dashboard/select-sites?worksiteId=${worksiteId}&hospitalId=${h.id}`
                  );
                }}
              >
                <ThemedText type="subtitle" style={styles.cardText}>
                  {h.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
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
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    position: "absolute",
    top: 60,
    left: Spacing.four,
    zIndex: 10,
    elevation: 10,
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
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    marginBottom: Spacing.four,
  },
  title: {
    textAlign: "center",
    fontSize: 32,
    fontWeight: "700",
  },
  list: {
    gap: Spacing.three,
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
  },
  card: {
    borderRadius: 20,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingTop: Spacing.six,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardText: {
    textAlign: "center",
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "600",
  },
});
