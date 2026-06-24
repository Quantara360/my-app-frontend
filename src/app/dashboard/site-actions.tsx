import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const siteNames: Record<string, string> = {
  apeksha: "Apeksha",
  razavi: "Razvi",
};

const actions = [
  { id: "attendance", title: "Mark Attendance" },
  { id: "add-image", title: "Add Image" },
];

export default function SiteActionsPage() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const siteId = Array.isArray(params.siteId)
    ? params.siteId[0]
    : params.siteId;
  const worksiteId = Array.isArray(params.worksiteId)
    ? params.worksiteId[0]
    : params.worksiteId;
  const siteLabel = siteId ? (siteNames[siteId] ?? siteId) : "Worksite";

  return (
    <ThemedView style={styles.container}>
      <View style={styles.background} />
      <View style={styles.backgroundCircleLarge} />
      <View style={styles.backgroundCircleSmall} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable
            style={[
              styles.menuButton,
              { backgroundColor: theme.backgroundElement },
            ]}
            onPress={() => router.back()}
            accessibilityLabel="Back"
          >
            <ThemedText type="subtitle" style={styles.menuText}>
              ←
            </ThemedText>
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroSection}>
          <ThemedText type="smallBold" style={styles.subtitle}>
            Choose an action
          </ThemedText>
          <ThemedText type="title" style={styles.title}>
            {siteLabel}
          </ThemedText>
          <ThemedText type="default" style={styles.description}>
            Select a workflow to continue with attendance or image upload.
          </ThemedText>
        </View>

        <View style={styles.cardList}>
          {actions.map((action) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => {
                if (action.id === "attendance") {
                  router.push({
                    pathname: "/mark-attendance",
                    params: { worksiteId: siteId ?? "" },
                  } as any);
                  return;
                }

                router.push({
                  pathname: "/add-image",
                  params: { worksiteId: siteId ?? "" },
                } as any);
              }}
            >
              <View style={styles.actionContent}>
                <ThemedText type="subtitle" style={styles.actionTitle}>
                  {action.title}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1E7DF",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F1E7DF",
  },
  backgroundCircleLarge: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    top: -160,
    right: -90,
  },
  backgroundCircleSmall: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    bottom: -100,
    left: -80,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: 20,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.four,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: 65,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  menuText: {
    fontSize: 22,
    lineHeight: 24,
  },
  heroSection: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
  },
  subtitle: {
    color: "#5A4A3F",
  },
  title: {
    lineHeight: 56,
    color: "#1E1B18",
  },
  description: {
    color: "#5A4A3F",
    maxWidth: 420,
  },
  cardList: {
    marginTop: Spacing.four,
    gap: Spacing.three,
  },
  actionCard: {
    borderRadius: 28,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 130,
  },
  actionCardPressed: {
    opacity: 0.85,
  },
  actionContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    textAlign: "center",
    fontSize: 28,
    lineHeight: 34,
  },
});
