import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing, MaxContentWidth, BottomTabInset } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const sites = [
  { id: "apeksha", title: "Apeksha" },
  { id: "razavi", title: "Razavi" },
];

export default function SelectSites() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const worksiteId = Number(params.worksiteId);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backText}>‹</ThemedText>
          </Pressable>
        </View>

        <View style={styles.centerContent}>
          <View style={styles.heroSection}>
            <ThemedText type="title" style={styles.title}>
              Select Sites
            </ThemedText>
          </View>

          <View style={styles.list}>
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
                    params: { siteId: site.id, worksiteId },
                  } as any);
                }}
              >
                <ThemedText type="subtitle" style={styles.cardText}>
                  {site.title}
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
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingTop: Spacing.six,
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
    fontSize: 38,
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
    minHeight: 130,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardText: {
    textAlign: "center",
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "600",
  },
});
