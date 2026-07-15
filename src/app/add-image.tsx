import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Platform, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing, rf } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/services/authService";
import { useGoBack } from "@/hooks/use-go-back";

export default function AddImagePage() {
  const goBack = useGoBack();
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { token } = useAuth();
  const params = useLocalSearchParams();
  const worksiteId = params.worksiteId;

  const [workers, setWorkers] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const refreshKey = String(params.refresh ?? "");

  useEffect(() => {
    const loadImages = async () => {
      if (!worksiteId || !token) return;
      try {
        const response = await fetch(`${API_BASE_URL}/sub-site-images?sub_site_id=${worksiteId}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const loaded: Record<number, string | null> = { 1: null, 2: null, 3: null };

          // Group by book_id and take the first one
          for (let i = 1; i <= 3; i++) {
            const bookImages = data.filter((img: any) => img.book_id === i);
            if (bookImages.length > 0) {
              loaded[i] = `${API_BASE_URL.replace("/api", "")}/storage/${bookImages[0].image_path}`;
            }
          }
          setImages(loaded);
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadImages();
  }, [worksiteId, refreshKey, token]);
  const [images, setImages] = useState<Record<number, string | null>>({
    1: null,
    2: null,
    3: null,
  });

  const pickImage = async (index: number) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages((prev) => ({ ...prev, [index]: result.assets[0].uri }));
    }
  };

  const openCapture = (index: number) => {
    router.push({
      pathname: "/add-image-capture",
      params: { book: index, worksiteId },
    } as any);
  };

  const bookNames: Record<number, string> = {
    1: "Hospital Book",
    2: "Attendance Book",
    3: "Other Documents",
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.background, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]} />
      <View style={[styles.backgroundCircleLarge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.65)" }]} />
      <View style={[styles.backgroundCircleSmall, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255, 255, 255, 0.5)" }]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable
            style={[
              styles.menuButton,
              { backgroundColor: theme.backgroundElement },
            ]}
            onPress={() => goBack()}
            accessibilityLabel="Back"
          >
            <ThemedText type="subtitle" style={styles.menuText}>
              ←
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.headerTitleRow}>
          <ThemedText type="title" style={styles.title}>
            Add Image
          </ThemedText>
        </View>

        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={styles.cardsScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardsContainer}>
            {[1, 2, 3].map((i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.bigCard,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.cardPressed,
                ]}
                onPress={() => openCapture(i)}
              >
                {images[i] && !failedImages[i] ? (
                  <Image
                    source={{ uri: images[i]! }}
                    style={styles.cardImage}
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [i]: true }))
                    }
                  />
                ) : (
                  <ThemedText type="subtitle" style={styles.bigCardText}>
                    {bookNames[i]}
                  </ThemedText>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer} />

        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <Pressable
                style={styles.modalClose}
                onPress={() => setShowSuccess(false)}
              >
                <ThemedText style={styles.modalCloseText}>✕</ThemedText>
              </Pressable>

              <View style={styles.successCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>

              <ThemedText type="subtitle" style={styles.modalTitle}>
                Data Saved Successfully!
              </ThemedText>

              <Pressable
                style={styles.modalOkButton}
                onPress={() => {
                  setShowSuccess(false);
                  goBack();
                }}
              >
                <Text style={styles.modalOkText}>Ok</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
    alignSelf: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "stretch",
    paddingBottom: BottomTabInset + Spacing.five,
    flexGrow: 1,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.four,
    justifyContent: "center",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 0,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    marginTop: 50,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  backText: {
    fontWeight: "700",
  },
  title: { textAlign: "center" },
  card: {
    width: "100%",
    marginTop: Spacing.four,
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    gap: 12,
  },
  fieldRow: { gap: 8 },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  uploadButton: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  uploadText: { fontWeight: "600" },
  proceedButton: {
    marginTop: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#5c46f0",
    alignItems: "center",
    justifyContent: "center",
  },
  proceedButtonDisabled: {
    opacity: 0.7,
  },
  proceedText: { color: "#fff", fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  modalClose: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: { fontSize: 18 },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#1bcf4a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  checkMark: { color: "#fff", fontSize: 44, fontWeight: "700" },
  modalTitle: {
    textAlign: "center",
    marginBottom: 18,
  },
  modalOkButton: {
    marginTop: 6,
    backgroundColor: "#1bcf4a",
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOkText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  menuButton: {
    marginLeft: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 18,
    lineHeight: 20,
  },
  menuCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginRight: 2,
  },
  menuDropdown: {
    position: "absolute",
    right: Spacing.two,
    top: 110,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    zIndex: 50,
  },
  menuDropdownItem: {
    paddingVertical: Spacing.two,
  },
  menuDropdownText: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitleRow: {
    width: "100%",
    alignItems: "center",
    marginBottom: Spacing.three,
  },
  cardsContainer: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  cardsScrollContent: {
    flexGrow: 1,
    alignItems: 'stretch',
    paddingBottom: BottomTabInset + Spacing.four,
  },
  bigCard: {
    borderRadius: 18,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bigCardText: {
    fontSize: rf(24, 18, 28),
    lineHeight: rf(28, 22, 32),
    textAlign: "center",
    fontWeight: "600",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    resizeMode: "cover",
  },
  cardPressed: {
    opacity: 0.85,
  },
  footer: {
    width: "100%",
    alignItems: "center",
    marginTop: Spacing.four,
  },
});
