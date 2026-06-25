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
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing } from "@/constants/theme";
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
  const { token } = useAuth();
  const goBack = useGoBack();
  const { worksiteId, subSiteId, shift, state } = useLocalSearchParams<{ worksiteId?: string; subSiteId?: string; shift?: string; state?: string }>();
  console.log('[face-recognition] params:', { worksiteId, subSiteId, shift, state });
  const currentState = state || "IN";
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
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

  useEffect(() => {
    (async () => {
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

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
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

      // Convert image to base64 for the face service using the captured base64 data
      const base64 = photo.base64;
      const ext = photo.uri.split(".").pop() || "jpg";
      const dataUri = `data:image/${ext};base64,${base64}`;

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
        Alert.alert("Recognition Error", recData.error || "Face service error. Please try again.");
        setIsProcessing(false);
        return;
      }

      if (!recData.matched) {
        const reason = recData.reason || "";
        const msg = reason.toLowerCase().includes("no face")
          ? "No face detected. Please ensure your face is clearly visible and well-lit."
          : "Could not identify any registered worker. Please try again.";
        Alert.alert("No Match", msg);
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
        Alert.alert("Attendance Error", errMsg);
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
    } catch (e) {
      Alert.alert("Capture failed", String(e));
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
        Alert.alert("Error", "Could not delete attendance record");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Network error while deleting");
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
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundElement }]} onPress={goBack}>
          <ThemedText style={styles.backText}>Back</ThemedText>
        </Pressable>
      </View>
      <View style={styles.titleRow}>
        <View style={styles.headerText}>
          <ThemedText type="subtitle">Face Recognition</ThemedText>
          <ThemedText type="small">
            Please hold your face towards the camera steadily...
          </ThemedText>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}> 
        <ThemedText type="smallBold">Keep Your eyes open</ThemedText>

        <View style={styles.previewWrap}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
          ) : (
            <CameraView
              style={styles.camera}
              ref={cameraRef}
              onCameraReady={() => setCameraReady(true)}
              ratio="4:3"
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
          keyExtractor={(i) => String(i.id)}
          ListHeaderComponent={() => (
            <View style={styles.tableHeaderRow}>
              <ThemedText type="smallBold" style={{ width: 30 }}>ID</ThemedText>
              <ThemedText type="smallBold" style={{ flex: 1 }}>Name</ThemedText>
              <ThemedText type="smallBold" style={{ flex: 1.5 }}>Time & date</ThemedText>
              <ThemedText type="smallBold" style={{ width: 40 }}>State</ThemedText>
              <ThemedText type="smallBold" style={{ flex: 1.5 }}>Site</ThemedText>
              <View style={{ width: 30 }} />
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.tableRow}>
              <ThemedText type="small" style={{ width: 30 }}>{item.id}</ThemedText>
              <ThemedText type="small" style={{ flex: 1 }}>{item.name}</ThemedText>
              <ThemedText type="small" style={{ flex: 1.5 }}>{item.datetime}</ThemedText>
              <ThemedText type="small" style={{ width: 40 }}>{item.state || 'IN'}</ThemedText>
              <ThemedText type="small" style={{ flex: 1.5 }}>{item.site}</ThemedText>
              <Pressable style={{ width: 30, alignItems: 'center' }} onPress={() => handleDelete(item.id)}>
                <ThemedText style={{ color: 'red', fontSize: 16 }}>🗑</ThemedText>
              </Pressable>
            </View>
          )}
        />

        <Pressable
          style={styles.bottomButton}
          onPress={() => Alert.alert("Marked Attendance", "Attendance marked")}
        >
          <ThemedText type="smallBold" style={{ color: "#fff" }}>
            Marked Attendance
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
    paddingTop: 60,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingBottom: BottomTabInset,
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
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backText: {
    fontWeight: "700",
  },
  headerText: {
    flex: 1,
    marginRight: Spacing.two,
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
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: {
    width: "92%",
    height: 220,
    borderRadius: 12,
  },
  greenBorder: {
    position: "absolute",
    width: "94%",
    height: 230,
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
  },
  tableHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
  },
});
