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

  // Web-only: ref to the <video> element that holds the live camera stream
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const webStreamRef = useRef<MediaStream | null>(null);

  // On web, imperatively create a <video> element and inject it into the
  // camera container div. This bypasses React Native Web's JSX rendering
  // quirks with raw HTML elements and guarantees a real HTMLVideoElement.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    let injectedVideo: HTMLVideoElement | null = null;

    const startWebCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        webStreamRef.current = stream;

        // Find the container by its nativeID (maps to the HTML id attribute)
        const container = document.getElementById('web-camera-container');
        if (!container || cancelled) return;

        // Create video element entirely in JS — reliable ref, real DOM element
        const videoEl = document.createElement('video');
        videoEl.srcObject = stream;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = true;
        videoEl.setAttribute('playsinline', 'true');
        videoEl.style.cssText =
          'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;';

        container.appendChild(videoEl);
        injectedVideo = videoEl;
        webVideoRef.current = videoEl;

        // Wait for metadata so we have real dimensions
        await new Promise<void>((resolve) => {
          if (videoEl.readyState >= 1) { resolve(); return; }
          videoEl.onloadedmetadata = () => resolve();
          setTimeout(resolve, 3000);
        });

        if (cancelled) return;
        await videoEl.play();

        // Wait for first frame to be rendering
        await new Promise<void>((resolve) => {
          if (!videoEl.paused) { resolve(); return; }
          videoEl.onplaying = () => resolve();
          setTimeout(resolve, 1000);
        });

        if (!cancelled) setCameraReady(true);
      } catch (e: any) {
        if (!cancelled) console.error('Web camera error:', e);
      }
    };

    startWebCamera();

    return () => {
      cancelled = true;
      webStreamRef.current?.getTracks().forEach(t => t.stop());
      webStreamRef.current = null;
      if (injectedVideo?.parentNode) injectedVideo.parentNode.removeChild(injectedVideo);
      webVideoRef.current = null;
    };
  }, []);

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

  // Helper: waits for an actual decoded frame before we draw to canvas.
  // Uses requestVideoFrameCallback (Chrome/Edge) or double-rAF (Firefox).
  const waitForFrame = (video: HTMLVideoElement): Promise<void> =>
    new Promise((resolve) => {
      if ('requestVideoFrameCallback' in video) {
        (video as any).requestVideoFrameCallback(() => resolve());
      } else {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }
    });

  const onCapture = async () => {
    if (isTaking) return;
    if (captured.length >= 10) {
      Alert.alert("Limit reached", "Maximum 10 images per book within the last 24 hours.");
      return;
    }
    if (!worksiteId || !token) return;

    if (Platform.OS === 'web') {
      setIsTaking(true);
      try {
        // Use the stored stream directly — do NOT rely on the DOM-injected display video.
        // Create a fresh hidden video element appended to document.body so the
        // browser always decodes real frames (avoids black/blank canvas).
        const stream = webStreamRef.current;
        if (!stream || stream.getVideoTracks().length === 0) {
          throw new Error('Camera is not available. Please reload and allow camera access.');
        }

        const track = stream.getVideoTracks()[0];
        if (track.readyState !== 'live') {
          throw new Error('Camera track ended. Please reload the page.');
        }

        // Create an off-screen video element on document.body
        const captureVid = document.createElement('video');
        captureVid.srcObject = new MediaStream([track]);
        captureVid.muted = true;
        captureVid.playsInline = true;
        captureVid.setAttribute('playsinline', 'true');
        // Position off-screen so it never appears but still decodes
        captureVid.style.cssText =
          'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.body.appendChild(captureVid);

        try {
          await captureVid.play();

          // Wait until the browser has actual frame data (HAVE_FUTURE_DATA or better)
          await new Promise<void>((resolve) => {
            if (captureVid.readyState >= 3) { resolve(); return; }
            captureVid.addEventListener('canplay', () => resolve(), { once: true });
            setTimeout(resolve, 4000); // max 4s timeout
          });

          // Extra warmup — camera auto-exposure needs a moment
          await new Promise<void>((resolve) => setTimeout(resolve, 600));

          if (captureVid.videoWidth === 0 || captureVid.videoHeight === 0) {
            throw new Error('Camera did not produce a valid frame. Please try again.');
          }

          const canvas = document.createElement('canvas');
          canvas.width = captureVid.videoWidth;
          canvas.height = captureVid.videoHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(captureVid, 0, 0, canvas.width, canvas.height);

          // Convert canvas to Blob
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to create image blob'));
            }, 'image/jpeg', 0.85);
          });

          const formData = new FormData();
          formData.append('sub_site_id', worksiteId as string);
          formData.append('book_id', book.toString());
          formData.append('photo', blob, `photo_${Date.now()}.jpg`);

          const response = await fetch(`${API_BASE_URL}/sub-site-images/upload`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            setCaptured((prev) => [data, ...prev]);
          } else {
            const err = await response.json().catch(() => ({}));
            Alert.alert('Error', err.error || 'Failed to upload image');
          }
        } finally {
          // Always clean up the off-screen video
          captureVid.pause();
          captureVid.srcObject = null;
          if (captureVid.parentNode) captureVid.parentNode.removeChild(captureVid);
        }
      } catch (e: any) {
        console.error('Web capture error:', e);
        Alert.alert('Error', e.message || 'Failed to capture image');
      } finally {
        setIsTaking(false);
      }
      return;
    }

    if (!cameraRef.current) return;

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

        <View style={styles.cameraWrap} nativeID="web-camera-container">
          {/* On web: <video> is injected imperatively by useEffect into this container */}
          {Platform.OS !== 'web' && (
            <CameraView
              style={StyleSheet.absoluteFill}
              ref={cameraRef}
              onCameraReady={() => setCameraReady(true)}
            />
          )}

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
