import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/services/authService";

export default function AddImagePage() {
  const router = useRouter();
  const theme = useTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams();
  const worksiteId = params.worksiteId;

  const [workers, setWorkers] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showSuccess, setShowSuccess] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  const refreshKey = String(params.refresh ?? "");

  useEffect(() => {
    const loadStored = async () => {
      try {
        const loaded: Record<number, string | null> = {
          1: null,
          2: null,
          3: null,
        };
        for (let i = 1; i <= 3; i++) {
          const key = `addimage.${worksiteId}.book.${i}`;
          const json = await SecureStore.getItemAsync(key);
          if (json) {
            const arr: string[] = JSON.parse(json);
            // take first image preview for card
            if (arr.length > 0) loaded[i] = arr[0];
          }
        }
        setImages(loaded);
      } catch (e) {
        console.error(e);
      }
    };

    loadStored();
  }, [worksiteId, refreshKey]);
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

  return (
    <ThemedView style={styles.container}>
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

          <Pressable
            style={[
              styles.menuCircle,
              { backgroundColor: theme.backgroundElement },
            ]}
            onPress={() => setShowMenu((prev) => !prev)}
          >
            <ThemedText type="subtitle" style={styles.menuText}>
              ☰
            </ThemedText>
          </Pressable>
        </View>

        {showMenu ? (
          <View
            style={[
              styles.menuDropdown,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <Pressable
              style={styles.menuDropdownItem}
              onPress={() => {
                setShowMenu(false);
                router.replace("/login");
              }}
            >
              <Text style={[styles.menuDropdownText, { color: theme.text }]}>
                Logout
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.headerTitleRow}>
          <ThemedText type="title" style={styles.title}>
            Add Image
          </ThemedText>
        </View>

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
                  {`Book ${i}`}
                </ThemedText>
              )}
            </Pressable>
          ))}
        </View>

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
                  router.back();
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
    marginLeft: 2,
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
    maxWidth: 380,
    alignSelf: "center",
    gap: Spacing.three,
  },
  bigCard: {
    borderRadius: 18,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bigCardText: {
    fontSize: 28,
    lineHeight: 28,
    textAlign: "center",
    color: "#000",
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
