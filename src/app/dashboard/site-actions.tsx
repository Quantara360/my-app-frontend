import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, View, useColorScheme } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useGoBack } from "@/hooks/use-go-back";

const siteNames: Record<string, string> = {
  apeksha: "Apeksha",
  razavi: "Razvi",
};

const actions = [
  { id: "attendance", title: "Mark Attendance" },
  { id: "add-image", title: "Add Image" },
];

export default function SiteActionsPage() {
  const goBack = useGoBack();
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const siteId = Array.isArray(params.siteId) ? params.siteId[0] : params.siteId;
  const worksiteId = Array.isArray(params.worksiteId) ? params.worksiteId[0] : params.worksiteId;
  const passedSiteName = Array.isArray(params.siteName) ? params.siteName[0] : params.siteName;
  
  const siteLabel = passedSiteName ? passedSiteName : siteId ? (siteNames[siteId] ?? siteId) : "Worksite";

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]}>
      <View style={[styles.background, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]} />
      <View style={[styles.backgroundCircleLarge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.65)" }]} />
      <View style={[styles.backgroundCircleSmall, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255, 255, 255, 0.5)" }]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable
            style={[
              styles.menuButton,
              { backgroundColor: theme.backgroundElement, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" },
            ]}
            onPress={() => goBack()}
            accessibilityLabel="Back"
          >
            <ThemedText type="subtitle" style={[styles.menuText, { color: isDark ? "#fff" : "#000" }]}>
              ←
            </ThemedText>
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroSection}>
          <ThemedText type="smallBold" style={[styles.subtitle, { color: isDark ? "#aaa" : "#5A4A3F" }]}>
            Choose an action
          </ThemedText>
          <ThemedText type="title" style={[styles.title, { color: isDark ? "#fff" : "#1E1B18" }]}>
            {siteLabel}
          </ThemedText>
          <ThemedText type="default" style={[styles.description, { color: isDark ? "#ccc" : "#5A4A3F" }]}>
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
                    params: { worksiteId: worksiteId ?? "", subSiteId: siteId ?? "" },
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
                <ThemedText type="subtitle" style={[styles.actionTitle, { color: isDark ? "#fff" : "#000" }]}>
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
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundCircleLarge: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    top: -160,
    right: -90,
  },
  backgroundCircleSmall: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
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
  },
  title: {
    lineHeight: 56,
  },
  description: {
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
