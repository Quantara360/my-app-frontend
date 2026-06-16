import { Camera, CameraView } from "expo-camera";
import * as FileSystem from "expo-file-system";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
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

function formatDate(d: Date) {
  return d.toLocaleDateString();
}

export default function FaceRecognition() {
  const theme = useTheme();
  const { token } = useAuth();
  const { worksiteId, shift } = useLocalSearchParams<{ worksiteId?: string; shift?: string }>();
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

  // Fetch today's attendances on mount
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(`${API_BASE_URL}/attendances?worksite_id=${worksiteId || ""}&date=${today}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.data) {
          setList(data.data.map((att: any) => ({
            id: att.id,
            name: att.worker?.name,
            datetime: new Date(att.marked_at).toLocaleString(),
            site: att.worksite?.name || "—"
          })));
        }
      } catch (e) {
        console.error("Failed to load attendances:", e);
      }
    })();
  }, [token, worksiteId]);

  async function capture() {
    if (!cameraRef.current || isProcessing) return;
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
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

      if (!recData.success) {
        Alert.alert("Recognition Error", recData.error || "Face service error");
        setIsProcessing(false);
        return;
      }

      if (!recData.matched) {
        Alert.alert("No Match", "Could not identify any registered worker.");
        setIsProcessing(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const currentShift = (shift as string) || "Morning";

      // Mark attendance
      const attRes = await fetch(`${API_BASE_URL}/attendances`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          worker_id: recData.worker_id,
          worksite_id: worksiteId || null,
          shift: currentShift,
          date: today,
          method: "face",
          confidence: recData.distance,
        }),
      });
      const attData = await attRes.json();

      if (!attRes.ok || !attData.success) {
        Alert.alert("Attendance Error", attData.error || "Failed to mark attendance for this worker.");
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
          site: result.site,
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
        <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundElement }]} onPress={() => router.back()}>
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
              <ThemedText type="smallBold" style={{ flex: 2 }}>Time & date</ThemedText>
              <ThemedText type="smallBold" style={{ flex: 1.5 }}>Site</ThemedText>
              <View style={{ width: 30 }} />
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.tableRow}>
              <ThemedText type="small" style={{ width: 30 }}>{item.id}</ThemedText>
              <ThemedText type="small" style={{ flex: 1 }}>{item.name}</ThemedText>
              <ThemedText type="small" style={{ flex: 2 }}>{item.datetime}</ThemedText>
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
