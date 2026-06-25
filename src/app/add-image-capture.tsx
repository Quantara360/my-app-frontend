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
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { CameraView } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { Spacing, MaxContentWidth, BottomTabInset } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/services/authService";
import { useGoBack } from "@/hooks/use-go-back";

export default function AddImageCapture() {
  const goBack = useGoBack();
  const params = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const { token } = useAuth();
  const book = Number(params.book ?? 1);
  const worksiteId = params.worksiteId;

  // We store full image objects { id: number, image_path: string }
  const [captured, setCaptured] = useState<any[]>([]);
  const [isTaking, setIsTaking] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  // Fullscreen Preview State
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    loadImages();
  }, [book, worksiteId, token]);

  const loadImages = async () => {
    if (!worksiteId || !token) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/sub-site-images?sub_site_id=${worksiteId}&book_id=${book}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCaptured(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getFullImageUrl = (path: string) => {
    return `${API_BASE_URL.replace("/api", "")}/storage/${path}`;
  };

  const captureWebPhoto = async () => {
    try {
      // Get camera stream directly from browser
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play();

      // Wait for video to have dimensions
      await new Promise<void>((resolve) => {
        if (video.videoWidth > 0) { resolve(); return; }
        video.onloadedmetadata = () => resolve();
        setTimeout(resolve, 1000);
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // Stop stream tracks
      stream.getTracks().forEach(t => t.stop());

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      return { uri: dataUrl };
    } catch (e: any) {
      throw new Error('Failed to capture: ' + e.message);
    }
  };

  const onCapture = async () => {
    if (Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new (window as any).ImageCapture(track);
        const bitmap = await imageCapture.grabFrame();
        
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(bitmap, 0, 0);
        track.stop();
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        console.log('Captured dataUrl length:', dataUrl.length);
        console.log('First 100 chars:', dataUrl.substring(0, 100));
        // setPhotoUri(dataUrl); // uncomment after testing
      } catch (e) {
        console.error('Capture error:', e);
      }
      return;
    }

    if (isTaking) return;
    if (captured.length >= 10) {
      Alert.alert("Limit reached", "Maximum 10 images per book within the last 24 hours.");
      return;
    }
    if (!cameraRef.current || !worksiteId || !token) return;

    setIsTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });

      if (!photo) throw new Error("No photo captured");

      const formData = new FormData();
      formData.append("sub_site_id", worksiteId as string);
      formData.append("book_id", book.toString());
      formData.append("photo", {
        uri: photo.uri,
        name: `photo_${Date.now()}.jpg`,
        type: "image/jpeg",
      } as any);

      const response = await fetch(`${API_BASE_URL}/sub-site-images/upload`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          // don't set Content-Type for FormData
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCaptured((prev) => [data, ...prev]); // Add to beginning (latest first)
      } else {
        const err = await response.json();
        Alert.alert("Error", err.error || "Failed to upload image");
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message || "Failed to capture image");
    } finally {
      setIsTaking(false);
    }
  };

  const removeImage = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sub-site-images/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setCaptured((prev) => prev.filter((img) => img.id !== id));
        if (previewIndex !== null) setPreviewIndex(null); // close preview if open
      }
    } catch (e) {
      console.error(e);
    }
  };

  const downloadImage = async (url: string) => {
    setIsDownloading(true);
    try {
      if (Platform.OS === "web") {
        // Simple web download
        const a = document.createElement("a");
        a.href = url;
        a.download = `site_image_${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission required", "We need permission to save to your gallery");
          return;
        }

        const fileUri = `${FileSystem.documentDirectory}${Date.now()}.jpg`;
        const downloadedFile = await FileSystem.downloadAsync(url, fileUri);

        await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);
        Alert.alert("Success", "Image saved to gallery");
      }
    } catch (error) {
      console.error("Download failed:", error);
      Alert.alert("Error", "Failed to download image");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            style={[styles.circleButton, { backgroundColor: theme.backgroundElement }]}
            onPress={() => goBack()}
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
            ref={cameraRef}
            onCameraReady={() => setCameraReady(true)}
          />

          <View style={styles.overlayCenter} pointerEvents="none">
            <View style={styles.outerFrame}>
              <View style={styles.innerFrame} />
            </View>
          </View>

          {!cameraReady ? (
            <View style={styles.cameraLoadingOverlay} pointerEvents="none">
              <Text style={styles.cameraPlaceholderText}>Starting camera...</Text>
            </View>
          ) : null}

          {isTaking ? (
            <View style={styles.cameraLoadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#1BCF4A" />
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
            style={[styles.captureButton, { backgroundColor: theme.backgroundElement }]}
            onPress={onCapture}
            disabled={isTaking}
          >
            <Image
              source={require("@/assets/images/shutter-camera.png")}
              style={styles.cameraIconImage}
            />
          </Pressable>
        </View>

        <View style={styles.thumbContainer}>
          <View style={[styles.thumbCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle" style={styles.thumbTitle}>
              Preview
            </ThemedText>
            <View style={styles.thumbGrid}>
              {Array.from({ length: 10 }).map((_, i) => (
                <View key={i} style={styles.thumbSlot}>
                  {captured[i] ? (
                    <Pressable style={styles.thumbTouchable} onPress={() => setPreviewIndex(i)}>
                      <Image
                        source={{ uri: getFullImageUrl(captured[i].image_path) }}
                        style={styles.thumbImage}
                      />
                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => removeImage(captured[i].id)}
                      >
                        <Text style={styles.removeX}>✕</Text>
                      </Pressable>
                    </Pressable>
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

      {/* Fullscreen Preview Modal */}
      <Modal
        visible={previewIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewIndex(null)}
      >
        {previewIndex !== null && captured[previewIndex] && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable style={styles.modalCloseBtn} onPress={() => setPreviewIndex(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>
            <Image
              source={{ uri: getFullImageUrl(captured[previewIndex].image_path) }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.downloadButton, isDownloading && { opacity: 0.7 }]}
                onPress={() => downloadImage(getFullImageUrl(captured[previewIndex].image_path))}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.downloadButtonText}>Download</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
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
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: Spacing.three,
  },
  cameraLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
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
  thumbTouchable: {
    width: "100%",
    height: "100%",
  },
  thumbImage: { width: "100%", height: "100%", resizeMode: "cover" },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeX: { fontSize: 10, fontWeight: "700", color: "#fff" },
  doneRow: {
    alignItems: "center",
    marginBottom: BottomTabInset,
    width: "100%",
  },
  doneButton: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20 },
  doneText: { color: "#fff", fontWeight: "700" },

  /* Modal Styles */
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: Spacing.four,
    paddingTop: Spacing.six,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  fullscreenImage: {
    flex: 1,
    width: "100%",
  },
  modalFooter: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    alignItems: "center",
  },
  downloadButton: {
    backgroundColor: "#1BCF4A",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
