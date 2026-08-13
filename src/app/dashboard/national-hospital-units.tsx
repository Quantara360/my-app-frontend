import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing, MaxContentWidth, BottomTabInset } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useGoBack } from "@/hooks/use-go-back";

const nationalHospitalUnits = [
  { id: "accident-ward", title: "Accident Ward" },
  { id: "neuro-trauma", title: "Neuro Trauma Unit" },
  { id: "cardiology", title: "Cardiology Unit" },
  { id: "opd", title: "OPD" },
  { id: "200q", title: "200Q" },
  { id: "nts", title: "NTS" },
  { id: "kitchen", title: "Kitchen" },
];

export default function NationalHospitalUnits() {
  const goBack = useGoBack();
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const worksiteId = Array.isArray(params.worksiteId)
    ? params.worksiteId[0]
    : params.worksiteId;

  return (
    <ThemedView style={styles.container}>
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
          style={{ flex: 1, width: "100%", overscrollBehavior: 'none' } as any}
          contentContainerStyle={styles.centerContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >

          <View style={styles.list}>
            {nationalHospitalUnits.map((unit) => (
              <Pressable
                key={unit.id}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.cardPressed,
                ]}
                onPress={() => {
                  router.push({
                    pathname: "/dashboard/site-actions",
                    params: { siteId: unit.id, worksiteId, siteName: unit.title },
                  } as any);
                }}
              >
                <ThemedText type="subtitle" style={styles.cardText}>
                  {unit.title}
                </ThemedText>
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
    flexDirection: "row",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: 60,
    paddingBottom: BottomTabInset + Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: Spacing.three,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 4,
    marginTop: Platform.select({ web: 20, default: 50 }),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  backText: {
    fontWeight: "700",
    fontSize: 24,
    lineHeight: 28,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingBottom: Spacing.four,
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    marginTop: 34,
    marginBottom: Spacing.four,
  },
  title: {
    textAlign: "center",
    fontSize: 24,
  },
  list: {
    gap: 12,
    flexDirection: "column",
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    paddingHorizontal: Spacing.two,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: Spacing.four,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardText: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
});
