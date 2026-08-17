import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BackgroundPattern } from "@/components/BackgroundPattern";
import { BottomTabInset, MaxContentWidth, Spacing, rf } from "@/constants/theme";
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
  const hospitalId = Array.isArray(params.hospitalId) ? params.hospitalId[0] : params.hospitalId;
  const passedSiteName = Array.isArray(params.siteName) ? params.siteName[0] : params.siteName;
  const isWorksite = Array.isArray(params.isWorksite) ? params.isWorksite[0] : params.isWorksite;

  // The scoped image ID: prefer sub-site > hospital > null
  // We never fall back to worksiteId to avoid ID collision between
  // worksites.id and sub_sites.id (same numbers, different tables)
  // HOSPITAL_ID_OFFSET: hospitals.id and sub_sites.id both start from 1,
  // so a bare hospitalId can collide with an unrelated sub_site_id
  // (e.g. Castle hospital.id=2 colliding with Razavi sub_site.id=2).
  // Offsetting hospital-based scope IDs keeps them in a separate numeric
  // range so they can never collide with a real sub_site_id.
  const HOSPITAL_ID_OFFSET = 100000;
  const hospitalScopeId = hospitalId ? String(Number(hospitalId) + HOSPITAL_ID_OFFSET) : null;
  const imageScopeId = siteId ?? (isWorksite === 'true' ? null : hospitalScopeId) ?? null;

  const siteLabel = passedSiteName ? passedSiteName : siteId ? (siteNames[siteId] ?? siteId) : "Worksite";

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]}>
      <BackgroundPattern />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={{ overscrollBehavior: 'none' } as any}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          overScrollMode="never"
        >
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
                    params: { worksiteId: worksiteId ?? "", hospitalId: hospitalId ?? "", subSiteId: siteId ?? "" },
                  } as any);
                  return;
                }

                // For add-image: pass worksiteId separately from the scoped
                // sub_site_id so they never collide (different DB tables).
                // imageScopeId is null when the worksite has no sub-sites —
                // in that case we use worksiteId as the worksite-level scope.
                // parentWorksiteId is always the real worksite — used together
                // with sub_site_id to prevent collision when two different
                // worksites have sub-sites that share the same numeric ID.
                router.push({
                  pathname: "/add-image",
                  params: {
                    worksiteId: imageScopeId ?? worksiteId ?? "",
                    isWorksite: imageScopeId ? "false" : "true",
                    parentWorksiteId: worksiteId ?? "",
                  },
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
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: 20,
    paddingBottom: BottomTabInset + Spacing.three,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: Spacing.four,
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
    marginLeft: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: Platform.select({ web: 8, default: 12 }),
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
    marginTop: 40,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    alignItems: "center",
    width: "100%",
  },
  subtitle: {
    textAlign: "left",
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  title: {
    lineHeight: Platform.select({ web: 40, default: 56 }),
    textAlign: "center",
  },
  description: {
    maxWidth: 420,
    textAlign: "center",
  },
  cardList: {
    marginTop: Spacing.four,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
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
    fontSize: rf(24, 18, 28),
    lineHeight: rf(30, 24, 34),
  },
});
