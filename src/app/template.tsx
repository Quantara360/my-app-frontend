import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BackgroundPattern } from '@/components/BackgroundPattern';
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing, MaxContentWidth } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { API_BASE_URL } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { useGoBack } from "@/hooks/use-go-back";
import { WorkerIdCardModal, printCard, downloadPdfCard } from "@/components/WorkerIdCardModal";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Detect mobile browser (web running on a phone/tablet)
const isMobileBrowser =
  Platform.OS === 'web' &&
  typeof navigator !== 'undefined' &&
  /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

type Worksite = { id: number; name: string };
type Worker = {
  id: number;
  name: string;
  role: string;
  assigned_worksite_id: number | null;
  worksite?: Worksite;
  nic?: string;
  age?: number;
  join_date?: string;
  face_recognition_enabled: boolean;
  face_photo_path?: string;
};

export default function TemplatePage() {
  const goBack = useGoBack();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const { token } = useAuth();
  // Optional deep-link from other screens (e.g. the attendance table's
  // "ID Card" button) - pre-opens the matching worker's card once the
  // worker list has loaded, instead of requiring a manual search here.
  const { workerId } = useLocalSearchParams<{ workerId?: string }>();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/workers`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setWorkers(Array.isArray(data) ? data : data.data || []);
      } catch (e) {
        console.error("Failed to fetch workers", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filtered = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      String(w.id).includes(search)
  );

  const openCard = (w: Worker) => { setSelectedWorker(w); setShowCard(true); };

  // Auto-open the card for ?workerId=... once the worker list has loaded.
  useEffect(() => {
    if (!workerId || workers.length === 0) return;
    const match = workers.find((w) => String(w.id) === String(workerId));
    if (match) openCard(match);
  }, [workerId, workers]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]}>
      <BackgroundPattern />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>Worker ID Templates</ThemedText>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={{ marginRight: 8, fontSize: 16 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or ID"
            placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
            style={styles.searchInput}
          />
        </View>

        {/* Table */}
        {loading ? (
          <ActivityIndicator color="#6a0dad" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={{ flex: 1 }} nestedScrollEnabled bounces={false} overScrollMode="never">
            <ScrollView horizontal>
              <View style={[styles.tableCard, { minWidth: 580 }]}>
                <View style={[styles.row, styles.headerRow]}>
                  <Text style={[styles.hCell, { flex: 0.5 }]}>ID</Text>
                  <Text style={[styles.hCell, { flex: 2 }]}>Name</Text>
                  <Text style={[styles.hCell, { flex: 2 }]}>Designation</Text>
                  <Text style={[styles.hCell, { flex: 2 }]}>Site</Text>
                  <Text style={[styles.hCell, { flex: 2.5 }]}>Actions</Text>
                </View>
                {filtered.length === 0 ? (
                  <View style={styles.emptyRow}><Text style={styles.emptyTxt}>No workers found.</Text></View>
                ) : (
                  filtered.map((w, i) => (
                    <View key={w.id} style={[styles.row, i !== filtered.length - 1 && styles.divider]}>
                      <Text style={[styles.cell, { flex: 0.5 }]}>{w.id}</Text>
                      <Text style={[styles.cell, { flex: 2 }]}>{w.name}</Text>
                      <Text style={[styles.cell, { flex: 2 }]}>{w.role || "—"}</Text>
                      <Text style={[styles.cell, { flex: 2 }]}>{w.worksite?.name || "—"}</Text>
                      <View style={{ flex: 2.5, flexDirection: "row", gap: 8, alignItems: 'center' }}>

                        <Pressable onPress={() => openCard(w)} style={styles.viewBtn}>
                          <Text style={styles.viewBtnTxt}>👁 View</Text>
                        </Pressable>
                        {Platform.OS === "web" && !isMobileBrowser ? (
                          <Pressable onPress={() => printCard(w)} style={styles.printBtn}>
                            <Text style={styles.printBtnTxt}>🖨 Print</Text>
                          </Pressable>
                        ) : (
                          <Pressable onPress={() => downloadPdfCard(w)} style={styles.printBtn}>
                            <Text style={styles.printBtnTxt}>⬇ PDF</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </ScrollView>
        )}

        <WorkerIdCardModal
          visible={showCard}
          worker={selectedWorker}
          onClose={() => setShowCard(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1, padding: Spacing.four,
      paddingBottom: BottomTabInset,
      backgroundColor: isDark ? "#121212" : "#f5f5f5",
      maxWidth: MaxContentWidth,
      width: '100%',
      alignSelf: 'center',
      overflow: 'hidden',
    },
    header: { flexDirection: "row", alignItems: "center", marginBottom: 16, marginTop: 10 },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: isDark ? "#2a2a2a" : "#e5e5ea",
      justifyContent: "center", alignItems: "center", marginRight: 14,
    },
    backIcon: { fontSize: 24, color: isDark ? "#fff" : "#000", lineHeight: 28 },
    title: { fontSize: 20, fontWeight: "bold" },
    searchBox: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: isDark ? "#1e1e1e" : "#e0e0e0",
      borderRadius: 12, paddingHorizontal: 12, marginBottom: 14,
    },
    searchInput: {
      flex: 1, paddingVertical: 10,
      color: isDark ? "#fff" : "#000",
      outlineStyle: "none",
    } as any,
    tableCard: {
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      borderRadius: 16, overflow: "hidden",
    },
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14 },
    headerRow: {
      backgroundColor: isDark ? "#2a2a2a" : "#f8f9fa",
      borderBottomWidth: 1, borderBottomColor: isDark ? "#333" : "#e5e7eb",
    },
    hCell: { fontWeight: "600", fontSize: 13, color: isDark ? "#b0b0b0" : "#6b7280" },
    cell: { fontSize: 13, color: isDark ? "#fff" : "#374151" },
    divider: { borderBottomWidth: 1, borderBottomColor: isDark ? "#2a2a2a" : "#f0f0f0" },
    emptyRow: { padding: 30, alignItems: "center" },
    emptyTxt: { color: isDark ? "#b0b0b0" : "#6b7280" },

    viewBtn: { backgroundColor: "#6a0dad", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    viewBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
    printBtn: { backgroundColor: "#1a7a3a", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    printBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
    closeBtn: { backgroundColor: isDark ? "#444" : "#e5e5ea", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
    closeBtnTxt: { color: isDark ? "#fff" : "#333", fontSize: 13, fontWeight: "600" },
  });
