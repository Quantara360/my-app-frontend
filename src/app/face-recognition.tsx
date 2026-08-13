import { Camera, CameraView } from "expo-camera";
import * as FileSystem from "expo-file-system";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Modal,
  useColorScheme,
} from "react-native";

import { BackgroundPattern } from '@/components/BackgroundPattern';
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing, rf, MaxContentWidth } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/services/authService";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useGoBack } from "@/hooks/use-go-back";

function formatDate(d: Date) {
  return d.toLocaleDateString();
}

export default function FaceRecognition() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { token } = useAuth();
  const goBack = useGoBack();
  const { worksiteId, hospitalId, subSiteId, shift, state } = useLocalSearchParams<{ worksiteId?: string; hospitalId?: string; subSiteId?: string; shift?: string; state?: string }>();
  const currentState = state || "IN";
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"front" | "back">("front");
  const cameraRef = useRef<CameraView | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognized, setRecognized] = useState<any>({
    name: "",
    year: "",
    date: "",
    site: "",
  });
  const [list, setList] = useState<any[]>([]);
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error">("error");

  const showAlert = (title: string, message: string, type: "success" | "error" = "error") => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  useEffect(() => {
    (async () => {
      // Check first instead of unconditionally re-requesting: the normal
      // path here is mark-attendance.tsx's "Next >>" button, which already
      // requested (and got granted) camera permission a moment ago, tied to
      // that tap. Calling requestCameraPermissionsAsync() again here fires
      // a second, auto-on-mount permission prompt with no user gesture
      // behind it - on iOS/Android Chrome that's an extra, unnecessary
      // chance to hit the "close any bubbles or overlays" safety block,
      // since browsers are stricter about prompts not tied to a direct tap.
      // Only fall back to actually requesting if we land here without
      // already having permission (e.g. direct URL, browser back/forward).
      const existing = await Camera.getCameraPermissionsAsync();
      if (existing.status === "granted") {
        setHasPermission(true);
        return;
      }
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // Fetch today's attendances, then filter fully client-side
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        // Fetch ALL today's records — filter client-side so null sub_site_id records aren't silently dropped
        const res = await fetch(
          `${API_BASE_URL}/attendances?date=${today}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.data) {
          let records = data.data as any[];

          // Filter by sub_site_id: match the selected sub-site OR records with no sub-site assigned
          if (subSiteId) {
            const sid = Number(subSiteId);
            records = records.filter((att: any) =>
              att.sub_site_id === sid || att.sub_site_id === null
            );
          }

          // Filter by shift client-side (case-insensitive)
          if (shift) {
            const shiftNorm = shift.trim().toLowerCase();
            records = records.filter((att: any) =>
              (att.shift || "").toLowerCase() === shiftNorm
            );
          }

          // OUT screen: only show workers still clocked-IN so supervisor can mark them out
          if (currentState === "OUT") {
            records = records.filter((att: any) => !att.out_marked_at);
          }

          setList(records.map((att: any) => ({
            id: att.id,
            name: att.worker?.name,
            datetime: new Date(att.marked_at).toLocaleString(),
            site: att.sub_site?.name || att.worksite?.name || "\u2014",
            state: att.out_marked_at ? "OUT" : "IN"
          })));
        }
      } catch (e) {
        console.error("Failed to load attendances:", e);
      }
    })();
  }, [token, subSiteId, shift, currentState]);

  const captureWebPhoto = async () => {
    const video = document.querySelector('video');
    if (!video) throw new Error('Camera video element not found');

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise<void>((resolve) => {
        const cleanup = () => {
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('canplay', onReady);
        };
        const onReady = () => {
          cleanup();
          resolve();
        };
        video.addEventListener('loadeddata', onReady);
        video.addEventListener('canplay', onReady);
        setTimeout(() => {
          cleanup();
          resolve();
        }, 500);
      });
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to get canvas drawing context');

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    return { uri: dataUrl, base64: dataUrl.split(',')[1] };
  };

  async function capture() {
    if (!cameraRef.current || isProcessing) return;
    try {
      setIsProcessing(true);
      const photo = Platform.OS === 'web'
        ? await captureWebPhoto()
        : await cameraRef.current.takePictureAsync({
            quality: 0.7,
            base64: true,
          });
      if (!photo || !photo.base64) return;
      setPhotoUri(photo.uri);

      // Convert image to base64 for the face service using the captured base64 data.
      // Both capture paths (web canvas.toDataURL and native takePictureAsync) always
      // produce JPEG, and photo.base64 is already the raw base64 payload with no
      // data-URL prefix - so the mime type can be hardcoded here. (Do NOT derive it
      // from photo.uri: on web, photo.uri IS the full data URL with no "." in it,
      // so `.split(".").pop()` used to return the entire data URL as "ext" and
      // produce a garbled, doubly-prefixed string that failed base64 validation.)
      const base64 = photo.base64;
      const dataUri = `data:image/jpeg;base64,${base64}`;

      // POST to Laravel → Python face service
      const recRes = await fetch(`${API_BASE_URL}/face-recognition/recognize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ image_base64: dataUri }),
      });
      const recData = await recRes.json();
      console.log('[recognize] response:', recData);

      if (!recData.success) {
        // recData.error/reason come from the AI service or our own controller;
        // recData.message/errors is Laravel's shape for a validation failure
        // (e.g. request too large and image_base64 silently dropped) - fall
        // back through all of them before the generic message so failures are
        // actually diagnosable from the alert instead of a dead end.
        let errorMsg =
          recData.error ||
          recData.message ||
          (recData.errors ? JSON.stringify(recData.errors) : "") ||
          "Face service error. Please try again.";
        if (errorMsg.toLowerCase().includes("face could not be detected") || errorMsg.includes("enforce_detection")) {
          errorMsg = "No face detected in the picture. Please make sure your face is clearly visible and well-lit, then try again.";
        }
        showAlert("Recognition Error", errorMsg);
        setIsProcessing(false);
        return;
      }

      if (!recData.matched) {
        const reason = recData.reason || "";
        // Surface the backend's specific reason when it has one (e.g. an
        // ambiguous match between similar-looking workers) instead of
        // always falling back to a generic message that hides why.
        const msg = reason.toLowerCase().includes("no face")
          ? "No face detected. Please ensure your face is clearly visible and well-lit."
          : reason || "Could not identify any registered worker. Please try again.";
        showAlert("No Match", msg);
        setIsProcessing(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      // Normalize shift to Title Case (Morning/Evening)
      const rawShift = (shift as string) || "Morning";
      const currentShift = rawShift.charAt(0).toUpperCase() + rawShift.slice(1).toLowerCase();
      // Ensure worksiteId is a number or null (never empty string)
      const wsId = worksiteId && worksiteId !== "" ? Number(worksiteId) : null;

      const attendancePayload = {
        worker_id: recData.worker_id,
        worksite_id: wsId,
        hospital_id: hospitalId && hospitalId !== "" ? Number(hospitalId) : null,
        sub_site_id: subSiteId ? Number(subSiteId) : null,
        shift: currentShift,
        date: today,
        method: "face",
        confidence: recData.distance,
        state: currentState.toUpperCase(),
      };
      console.log('[attendance] sending payload:', JSON.stringify(attendancePayload));

      // Mark attendance
      const attRes = await fetch(`${API_BASE_URL}/attendances`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(attendancePayload),
      });
      const attData = await attRes.json();
      console.log('[attendance] response status:', attRes.status, 'body:', JSON.stringify(attData));

      if (!attRes.ok || !attData.success) {
        const errMsg = attData.message || attData.error || JSON.stringify(attData.errors) || "Failed to mark attendance.";
        showAlert("Attendance Error", errMsg);
        setIsProcessing(false);
        return;
      }

      const result = {
        name: recData.worker_name,
        year: new Date().getFullYear().toString(),
        date: today,
        dateCaptured: today,
        site: attData.attendance?.worksite?.name || "—",
      };

      setRecognized(result);
      setList((s) => [
        {
          id: attData.attendance?.id || s.length + 1,
          name: result.name,
          datetime: new Date().toLocaleString(),
          site: attData.attendance?.sub_site?.name || result.site,
          state: currentState.toUpperCase(),
        },
        ...s,
      ]);
      
      showAlert("Success", "Attendance marked successfully", "success");
    } catch (e) {
      showAlert("Capture failed", String(e));
    } finally {
      setIsProcessing(false);
      setPhotoUri(null);
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendances/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setList((prev) => prev.filter((item) => item.id !== id));
      } else {
        showAlert("Error", "Could not delete attendance record");
      }
    } catch (e) {
      console.error(e);
      showAlert("Error", "Network error while deleting");
    }
  };

  if (hasPermission === null)
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <ThemedText type="small">Requesting camera permission...</ThemedText>
      </ThemedView>
    );

  if (hasPermission === false)
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText type="small">Camera access denied.</ThemedText>
        <Pressable
          style={styles.openSettingsButton}
          onPress={() => {
            Linking.openSettings();
          }}
        >
          <ThemedText type="smallBold" style={{ color: "#fff" }}>
            Open Settings
          </ThemedText>
        </Pressable>
      </ThemedView>
    );

  return (
    <ThemedView style={{ flex: 1, backgroundColor: isDark ? "#121212" : "#F1E7DF" }}>
      <View style={[styles.background, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]} />
      <View style={[styles.backgroundCircleLarge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.65)" }]} />
      <View style={[styles.backgroundCircleSmall, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255, 255, 255, 0.5)" }]} />
      <ScrollView contentContainerStyle={styles.container} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundElement, borderColor: "rgba(128,128,128,0.2)" }]} onPress={goBack} accessibilityLabel="Back">
          <ThemedText type="subtitle" style={styles.backText}>←</ThemedText>
        </Pressable>
      </View>
      <View style={[styles.titleRow, { marginTop: Spacing.four, justifyContent: "center" }]}>
        <View style={[styles.headerText, { marginRight: 0 }]}>
          <ThemedText type="subtitle" style={{ textAlign: "center" }}>Face Recognition</ThemedText>
          <ThemedText type="small" style={{ textAlign: "center" }}>
            Please hold your face towards the camera steadily...
          </ThemedText>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}> 
        <View style={{ flexDirection: "row", width: "100%", alignItems: "center", marginBottom: Spacing.two }}>
          <View style={{ flex: 1 }} />
          <ThemedText type="smallBold" style={{ flex: 2, textAlign: "center" }}>Keep Your eyes open</ThemedText>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
        <Pressable style={styles.flipButton} onPress={() => {
          setCameraReady(false);
          setCameraFacing(prev => prev === 'front' ? 'back' : 'front');
        }}>
              <ThemedText style={styles.flipText}>🔄</ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.previewWrap}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
          ) : (
          <CameraView
            key={cameraFacing}
            style={styles.camera}
            ref={cameraRef}
            onCameraReady={() => setCameraReady(true)}
            facing={cameraFacing}
            />
          )}
          {!photoUri && !cameraReady && (
            <View style={styles.cameraLoadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#fff" />
              <ThemedText type="small">Starting camera...</ThemedText>
            </View>
          )}
          <View style={styles.greenBorder} pointerEvents="none">
            <View style={styles.innerBox} />
          </View>
        </View>

        <View style={styles.pillsRow}>
          <Pressable style={[styles.pillDisabled, { backgroundColor: theme.background }]}> 
            <ThemedText>{recognized.name || "—"}</ThemedText>
          </Pressable>
          <Pressable style={[styles.pillDisabled, { backgroundColor: theme.background }]}> 
            <ThemedText>{recognized.year || "—"}</ThemedText>
          </Pressable>
          <Pressable style={[styles.pillDisabled, { backgroundColor: theme.background }]}> 
            <ThemedText>{recognized.date || "—"}</ThemedText>
          </Pressable>
          <Pressable style={[styles.pillDisabled, { backgroundColor: theme.background }]}> 
            <ThemedText>{recognized.site || "—"}</ThemedText>
          </Pressable>
        </View>

        <Pressable style={[styles.markButton, isProcessing && { opacity: 0.7 }]} onPress={capture} disabled={isProcessing}>
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText type="smallBold" style={{ color: "#fff" }}>
              &lt;&lt;Mark&gt;&gt;
            </ThemedText>
          )}
        </Pressable>
      </View>

      <View style={styles.tableWrap}>
          <FlatList
            data={list}
            scrollEnabled={false}
            style={{ width: '100%' }}
            contentContainerStyle={{ width: '100%' }}
            keyExtractor={(i) => String(i.id)}
            ListHeaderComponent={() => (
              <View style={styles.tableHeaderRow}>
                <ThemedText type="smallBold" style={styles.colId}>ID</ThemedText>
                <ThemedText type="smallBold" style={styles.colName}>Name</ThemedText>
                <ThemedText type="smallBold" style={styles.colTime}>Time &amp; Date</ThemedText>
                <ThemedText type="smallBold" style={styles.colState}>State</ThemedText>
                <ThemedText type="smallBold" style={styles.colSite}>Site</ThemedText>
                <View style={styles.colAction} />
              </View>
            )}
            renderItem={({ item }) => (
              <View style={styles.tableRow}>
                <ThemedText type="small" style={[styles.colId, styles.cellText]} numberOfLines={1}>{item.id}</ThemedText>
                <ThemedText type="small" style={[styles.colName, styles.cellText]} numberOfLines={1}>{item.name}</ThemedText>
                <ThemedText type="small" style={[styles.colTime, styles.cellText]} numberOfLines={2}>{item.datetime}</ThemedText>
                <View style={[styles.colState, { alignItems: 'center' }]}>
                  <View style={[styles.stateBadge, { backgroundColor: item.state === 'OUT' ? '#ff6b6b22' : '#28a74522' }]}>
                    <ThemedText type="small" style={[styles.cellText, { color: item.state === 'OUT' ? '#c0392b' : '#1e8449', fontWeight: '700', fontSize: 10 }]} numberOfLines={1}>
                      {item.state || 'IN'}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="small" style={[styles.colSite, styles.cellText]} numberOfLines={2}>{item.site}</ThemedText>
                <Pressable style={styles.colAction} onPress={() => handleDelete(item.id)}>
                  <ThemedText style={{ color: '#e74c3c', fontSize: 14 }}>🗑</ThemedText>
                </Pressable>
              </View>
            )}
          />

        <Pressable
          style={styles.bottomButton}
          onPress={() => showAlert("Marked Attendance", "Attendance marked", "success")}
        >
          <ThemedText type="smallBold" style={{ color: "#fff" }}>
            Marked Attendance
          </ThemedText>
        </Pressable>
      </View>


      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, { backgroundColor: modalType === 'success' ? '#28a745' : '#dc3545' }]}>
              <ThemedText style={styles.modalTitle}>{modalTitle}</ThemedText>
            </View>
            <View style={styles.modalBody}>
              <ThemedText style={[styles.modalMessage, Platform.OS === 'web' && { wordBreak: 'break-word' } as any]}>{modalMessage}</ThemedText>
              <Pressable style={styles.modalButton} onPress={() => {
                setModalVisible(false);
                if (modalType === 'success') {
                  setRecognized({ name: "", year: "", date: "", site: "" });
                }
              }}>
                <ThemedText style={styles.modalButtonText}>OK</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    ...Platform.select({ web: { position: "fixed" as any } }),
  },
  backgroundCircleLarge: {
    position: Platform.select({ web: "fixed" as any, default: "absolute" }),
    width: Platform.select({ web: 280, default: 420 }),
    height: Platform.select({ web: 280, default: 420 }),
    borderRadius: Platform.select({ web: 140, default: 210 }),
    top: -160,
    right: -90,
  },
  backgroundCircleSmall: {
    position: Platform.select({ web: "fixed" as any, default: "absolute" }),
    width: Platform.select({ web: 180, default: 260 }),
    height: Platform.select({ web: 180, default: 260 }),
    borderRadius: Platform.select({ web: 90, default: 130 }),
    bottom: -100,
    left: -80,
  },
  container: {
    flexGrow: 1,
    padding: Spacing.four,
    paddingTop: 60,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingBottom: BottomTabInset,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: Spacing.two,
  },
  titleRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.two,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 15,
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
  backText: {
    fontSize: 22,
    lineHeight: 24,
  },
  headerText: {
    flex: 1,
    marginRight: Spacing.two,
    alignItems: "center",
  },
  flipButton: {
    padding: Spacing.two,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  flipText: {
    fontSize: 18,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: Spacing.four,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  previewWrap: {
    width: "100%",
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.two,
    position: "relative",
  },
  camera: {
    width: "92%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: {
    width: "92%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
  },
  greenBorder: {
    position: "absolute",
    width: "94%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: "#2bb34a",
    alignItems: "center",
    justifyContent: "center",
  },
  innerBox: {
    width: "80%",
    height: "70%",
    borderWidth: 2,
    borderColor: "#2bb34a",
    borderRadius: 8,
  },
  pillsRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    justifyContent: "space-between",
    marginTop: Spacing.two,
  },
  pillDisabled: {
    backgroundColor: "#f0f0f3",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: "22%",
    alignItems: "center",
    marginBottom: Spacing.two,
  },
  markButton: {
    marginTop: Spacing.two,
    backgroundColor: "#28a745",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  tableWrap: {
    width: "100%",
    marginTop: Spacing.three,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4b4fbf",
    paddingVertical: 10,
    paddingHorizontal: 8,
    width: '100%',
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    backgroundColor: "transparent",
    width: '100%',
  },
  colId: {
    flex: 0.6,
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  colName: {
    flex: 1.4,
    paddingRight: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  colTime: {
    flex: 1.8,
    paddingRight: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  colState: {
    flex: 0.8,
    paddingRight: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  colSite: {
    flex: 1.4,
    paddingRight: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  colAction: {
    width: 26,
    alignItems: "center",
  },
  cellText: {
    fontSize: 11,
    lineHeight: 15,
  },
  stateBadge: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButton: {
    marginTop: Spacing.three,
    backgroundColor: "#4b4fbf",
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  openSettingsButton: {
    marginTop: Spacing.two,
    backgroundColor: "#4b4fbf",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  cameraLoadingOverlay: {
    position: "absolute",
    width: "92%",
    aspectRatio: 4 / 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  modalHeader: {
    padding: 16,
    alignItems: "center",
  },
  modalTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  modalBody: {
    padding: 20,
    alignItems: "center",
    width: "100%",
  },
  modalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
    flexShrink: 1,
    width: "100%",
  },
  modalButton: {
    backgroundColor: "#4b4fbf",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
