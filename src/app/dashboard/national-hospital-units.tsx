import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing, MaxContentWidth, BottomTabInset } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

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
                    params: { siteId: unit.id, worksiteId },
                  } as any);
                }}
              >
                <ThemedText type="subtitle" style={styles.cardText}>
                  {unit.title}
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
    justifyContent: "center",
    flexDirection: "row",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: 30,
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.two,
    maxWidth: MaxContentWidth,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: Spacing.six,
    marginBottom: Spacing.three,
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
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    textAlign: "center",
    fontSize: 24,
  },
  list: {
    gap: Spacing.one,
    marginTop: Spacing.one,
    width: "100%",
    maxWidth: 420,
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
