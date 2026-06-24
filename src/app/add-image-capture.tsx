import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import * as SecureStore from "expo-secure-store";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { Spacing, MaxContentWidth, BottomTabInset } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function AddImageCapture() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const book = Number(params.book ?? 1);
  const worksiteId = params.worksiteId;

  const [captured, setCaptured] = useState<string[]>([]);
  const [isTaking, setIsTaking] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (!worksiteId) return;
        const key = `addimage.${worksiteId}.book.${book}`;
        const json = await SecureStore.getItemAsync(key);
        if (json) setCaptured(JSON.parse(json));
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [book, worksiteId]);

  const saveCaptured = async (arr: string[]) => {
    try {
      if (!worksiteId) return;
      const key = `addimage.${worksiteId}.book.${book}`;
      await SecureStore.setItemAsync(key, JSON.stringify(arr));
    } catch (e) {
      console.error(e);
    }
  };

  const onCapture = async () => {
    if (isTaking) return;
    if (captured.length >= 10) {
      Alert.alert("Limit reached", "Maximum 10 images per book");
      return;
    }

    setIsTaking(true);
    try {
      const uri = `placeholder://book-${book}-${Date.now()}`;
      const next = [...captured, uri];
      setCaptured(next);
      await saveCaptured(next);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTaking(false);
    }
  };

  const removeImage = async (index: number) => {
    const next = captured.filter((_, i) => i !== index);
    setCaptured(next);
    await saveCaptured(next);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            style={[
              styles.circleButton,
              { backgroundColor: theme.backgroundElement },
            ]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.iconText}>‹</ThemedText>
          </Pressable>

          <View style={styles.titleColumn}>
            <ThemedText type="title" style={styles.title}>
              Add Image
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              Capture up to 10 images for this worksite.
            </ThemedText>
          </View>

          <View style={styles.circlePlaceholder} />
        </View>

        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            ref={(ref) => {
              cameraRef.current = ref;
            }}
            onCameraReady={() => setCameraReady(true)}
          />

          <View style={styles.overlayCenter} pointerEvents="none">
            <View style={styles.outerFrame}>
              <View style={styles.innerFrame} />
            </View>
          </View>

          {!cameraReady ? (
            <View style={styles.cameraLoadingOverlay} pointerEvents="none">
              <Text style={styles.cameraPlaceholderText}>
                Starting camera...
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.instructionsRow}>
          <ThemedText style={styles.instructionsText}>
            Align the image inside the frame and tap the capture button below.
          </ThemedText>
        </View>

        <View style={styles.captureRow}>
          <Pressable
            style={[
              styles.captureButton,
              { backgroundColor: theme.backgroundElement },
            ]}
            onPress={onCapture}
          >
            <Image
              source={require("@/assets/images/shutter-camera.png")}
              style={styles.cameraIconImage}
            />
          </Pressable>
        </View>

        <View style={styles.thumbContainer}>
          <View
            style={[
              styles.thumbCard,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <ThemedText type="subtitle" style={styles.thumbTitle}>
              Preview
            </ThemedText>
            <View style={styles.thumbGrid}>
              {Array.from({ length: 10 }).map((_, i) => (
                <View key={i} style={styles.thumbSlot}>
                  {captured[i] ? (
                    <>
                      <Image
                        source={{ uri: captured[i] }}
                        style={styles.thumbImage}
                      />
                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => removeImage(i)}
                      >
                        <Text style={styles.removeX}>✕</Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.doneRow}>
          <Pressable
            style={[styles.doneButton, { backgroundColor: "#5c46f0" }]}
            onPress={() =>
              router.push({
                pathname: "/add-image",
                params: { worksiteId, refresh: Date.now() },
              } as any)
            }
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  scrollContent: {
    alignItems: "center",
    paddingTop: Spacing.six + Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    flexGrow: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.two,
    width: "100%",
    maxWidth: MaxContentWidth,
  },
  titleColumn: { flex: 1, paddingHorizontal: Spacing.two },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 20 },
  circlePlaceholder: { width: 40, height: 40 },
  title: { textAlign: "center" },
  subtitle: {
    textAlign: "center",
    marginTop: 4,
    opacity: 0.85,
    fontSize: 16,
    lineHeight: 20,
  },
  cameraWrap: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    aspectRatio: 3 / 4,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: Spacing.three,
  },
  cameraLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraPlaceholderText: {
    color: "#fff",
    fontSize: 16,
  },
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  outerFrame: {
    width: "90%",
    height: "90%",
    borderRadius: 12,
    borderWidth: 4,
    borderColor: "#1BCF4A",
    alignItems: "center",
    justifyContent: "center",
  },
  innerFrame: {
    width: "70%",
    height: "70%",
    borderWidth: 2,
    borderColor: "#0A7F2A",
  },
  instructionsRow: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    marginBottom: Spacing.two,
  },
  instructionsText: {
    textAlign: "center",
    opacity: 0.8,
  },
  captureRow: {
    alignItems: "center",
    marginBottom: Spacing.three,
    width: "100%",
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIconImage: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },

  thumbContainer: {
    marginBottom: Spacing.three,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  thumbCard: {
    borderRadius: 12,
    padding: Spacing.two,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  thumbTitle: { marginBottom: Spacing.two },
  thumbGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    rowGap: 8,
    columnGap: 8,
  },
  thumbSlot: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%", resizeMode: "cover" },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeX: { fontSize: 12, fontWeight: "700" },
  doneRow: {
    alignItems: "center",
    marginBottom: BottomTabInset,
    width: "100%",
  },
  doneButton: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20 },
  doneText: { color: "#fff", fontWeight: "700" },
});
