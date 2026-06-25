import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { API_BASE_URL } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { useGoBack } from "@/hooks/use-go-back";

// Base dimensions of the PSD template
const BASE_W = 975;
const BASE_H = 643;

// Base pixel positions from the PSD (at 975×643)
const RAW_PHOTO_X = 53;
const RAW_PHOTO_Y = 156;
const RAW_PHOTO_W = 240;
const RAW_PHOTO_H = 348;

const RAW_DATE_X = 52;
const RAW_DATE_Y = 535;

// Right-side info fields layout
const RAW_LABEL_X = 340;
const RAW_COLON_X = 550;
const RAW_INFO_X = 580;

// Restored original 3-row spacing
const RAW_ROW1_Y = 210;
const RAW_ROW2_Y = 287;
const RAW_ROW3_Y = 363;

// Site header in top left (left-aligned to stay clear of the logo)
const RAW_HEADER_SITE_X = 245;
const RAW_HEADER_SITE_Y = 24;

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

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function getPhotoUrl(worker: Worker): string | null {
  if (!worker.face_photo_path) return null;
  return `https://api.abeysone.cloud/storage/${worker.face_photo_path}`;
}

import { Asset } from 'expo-asset';

function printCard(worker: Worker) {
  if (Platform.OS !== "web") return;
  const photoUrl = getPhotoUrl(worker);
  const dateStr = formatDate(worker.join_date);
  
  const templateAsset = Asset.fromModule(require("../../assets/images/id_card_template_clean.png"));
  const templateUri = templateAsset.uri;

  // Photo box pixel positions on the 975×643 canvas
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>ID Card – ${worker.name}</title>
  <style>
    @page { size: 975px 643px; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 975px; height: 643px; overflow: hidden; }
    .card { position: relative; width: 975px; height: 643px; }
    .bg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .photo {
      position: absolute;
      left: 53px; top: 156px;
      width: 240px; height: 348px;
      object-fit: cover;
      border: 2px solid #111;
    }
    .photo-placeholder {
      position: absolute;
      left: 53px; top: 156px;
      width: 240px; height: 348px;
      background: #ccc;
      display: flex; align-items: center; justify-content: center;
      font-size: 60px;
    }
    .date {
      position: absolute;
      left: 52px; top: 535px;
      font-size: 20px; font-weight: 700; color: #111;
      font-family: Arial, sans-serif;
    }
    .label { font-size: 26px; font-weight: 700; color: #111; font-family: 'Arial Black', Arial, sans-serif; position: absolute; left: 340px; }
    .colon { font-size: 26px; font-weight: 700; color: #111; font-family: 'Arial Black', Arial, sans-serif; position: absolute; left: 550px; }
    .val { font-size: 26px; font-weight: 700; color: #111; font-family: Arial, sans-serif; position: absolute; left: 580px; }
    
    .header-site {
      position: absolute; left: 245px; top: 24px; right: 20px;
      font-size: 50px; font-weight: 900;
      font-family: 'Arial Black', Arial, sans-serif;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
    }

    .row1 { top: 210px; }
    .row2 { top: 287px; }
    .row3 { top: 363px; }
    @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="card">
    <img class="bg" src="${templateUri}" />
    ${photoUrl
      ? `<img class="photo" src="${photoUrl}" />`
      : `<div class="photo-placeholder">👤</div>`}
    <div class="header-site">
      <span style="color: #fff;">${worker.worksite?.name || "AMIL"} </span>
      <span style="color: #FFD700;">JANITOR SERVICES</span>
    </div>
    <div class="date">Date: ${dateStr}</div>
    <div class="label row1">NAME</div><div class="colon row1">:</div><div class="val row1">${worker.name}</div>
    <div class="label row2">DESIGNATION</div><div class="colon row2">:</div><div class="val row2">${worker.role || "—"}</div>
    <div class="label row3">NIC NO.</div><div class="colon row3">:</div><div class="val row3">${worker.nic || "—"}</div>
  </div>
  <script>
    Promise.all(Array.from(document.images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    })).then(() => {
      setTimeout(() => {
        window.print();
        window.close();
      }, 300);
    });
  <\/script>
</body>
</html>`;
  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

// -------------------------------------------------------------------------
import { useWindowDimensions, useColorScheme } from "react-native";

export default function TemplatePage() {
  const goBack = useGoBack();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const { token } = useAuth();
  
  const { width: screenWidth } = useWindowDimensions();
  // Max width 650, or responsive width with 40px padding
  const CARD_W = Math.min(650, screenWidth - 40);
  const CARD_H = Math.round(BASE_H * (CARD_W / BASE_W));
  const SCALE = CARD_W / BASE_W;

  const PHOTO_X = Math.round(RAW_PHOTO_X * SCALE);
  const PHOTO_Y = Math.round(RAW_PHOTO_Y * SCALE);
  const PHOTO_W = Math.round(RAW_PHOTO_W * SCALE);
  const PHOTO_H = Math.round(RAW_PHOTO_H * SCALE);

  const DATE_X = Math.round(RAW_DATE_X * SCALE);
  const DATE_Y = Math.round(RAW_DATE_Y * SCALE);

  const LABEL_X = Math.round(RAW_LABEL_X * SCALE);
  const COLON_X = Math.round(RAW_COLON_X * SCALE);
  const INFO_X = Math.round(RAW_INFO_X * SCALE);

  const ROW1_Y = Math.round(RAW_ROW1_Y * SCALE);
  const ROW2_Y = Math.round(RAW_ROW2_Y * SCALE);
  const ROW3_Y = Math.round(RAW_ROW3_Y * SCALE);

  const HEADER_SITE_X = Math.round(RAW_HEADER_SITE_X * SCALE);
  const HEADER_SITE_Y = Math.round(RAW_HEADER_SITE_Y * SCALE);

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

  return (
    <ThemedView style={styles.container}>
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
          <ScrollView style={{ flex: 1 }} nestedScrollEnabled>
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
                      <View style={[styles.cell, { flex: 2.5, flexDirection: "row", gap: 8 }]}>
                        <Pressable onPress={() => openCard(w)} style={styles.viewBtn}>
                          <Text style={styles.viewBtnTxt}>👁 View</Text>
                        </Pressable>
                        {Platform.OS === "web" && (
                          <Pressable onPress={() => printCard(w)} style={styles.printBtn}>
                            <Text style={styles.printBtnTxt}>🖨 Print</Text>
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

        {/* === ID Card Modal === */}
        {selectedWorker && (
          <Modal visible={showCard} transparent animationType="fade" onRequestClose={() => setShowCard(false)}>
            <View style={styles.overlay}>
              <View style={styles.modalBox}>
                {/* Modal toolbar */}
                <View style={styles.modalBar}>
                  <ThemedText type="subtitle" style={{ fontSize: 15, fontWeight: "700" }}>
                    ID Card – {selectedWorker.name}
                  </ThemedText>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {Platform.OS === "web" && (
                      <Pressable
                        onPress={() => { setShowCard(false); printCard(selectedWorker); }}
                        style={styles.printBtn}
                      >
                        <Text style={styles.printBtnTxt}>🖨 Print</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => setShowCard(false)} style={styles.closeBtn}>
                      <Text style={styles.closeBtnTxt}>✕ Close</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Card with real template as background */}
                <View style={{ width: CARD_W, height: CARD_H, position: "relative" }}>
                  {/* Background template image */}
                  <Image
                    source={require("../../assets/images/id_card_template_clean.png")}
                    style={{ position: "absolute", width: CARD_W, height: CARD_H }}
                    resizeMode="stretch"
                  />

                  {/* Worker Photo */}
                  {getPhotoUrl(selectedWorker) ? (
                    <Image
                      source={{ uri: getPhotoUrl(selectedWorker)! }}
                      style={{
                        position: "absolute",
                        left: PHOTO_X, top: PHOTO_Y,
                        width: PHOTO_W, height: PHOTO_H,
                        borderWidth: 2, borderColor: "#111",
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        position: "absolute",
                        left: PHOTO_X, top: PHOTO_Y,
                        width: PHOTO_W, height: PHOTO_H,
                        backgroundColor: "rgba(200,200,200,0.5)",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 36 }}>👤</Text>
                    </View>
                  )}

                  {/* Date */}
                  <Text
                    style={{
                      position: "absolute",
                      left: DATE_X, top: DATE_Y,
                      fontSize: Math.round(20 * SCALE),
                      fontWeight: "700",
                      color: "#111",
                    }}
                  >
                    Date: {formatDate(selectedWorker.join_date)}
                  </Text>

                  {/* Header Site Name + JANITOR SERVICES */}
                  <Text
                    style={{
                      position: "absolute",
                      left: HEADER_SITE_X, top: HEADER_SITE_Y,
                      width: CARD_W - HEADER_SITE_X - Math.round(20 * SCALE),
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    <Text style={{ fontSize: Math.round(50 * SCALE), fontWeight: "900", color: "#fff", textTransform: "uppercase" }}>
                      {selectedWorker.worksite?.name || "AMIL"}{" "}
                    </Text>
                    <Text style={{ fontSize: Math.round(50 * SCALE), fontWeight: "900", color: "#FFD700", textTransform: "uppercase" }}>
                      JANITOR SERVICES
                    </Text>
                  </Text>

                  {/* Labels, Colons and Values */}
                  {[
                    { y: ROW1_Y, label: "NAME", value: selectedWorker.name },
                    { y: ROW2_Y, label: "DESIGNATION", value: selectedWorker.role || "—" },
                    { y: ROW3_Y, label: "NIC NO.", value: selectedWorker.nic || "—" },
                  ].map((row, idx) => (
                    <View key={idx}>
                      <Text style={{ position: "absolute", left: LABEL_X, top: row.y, fontSize: Math.round(26 * SCALE), fontWeight: "900", color: "#111" }}>
                        {row.label}
                      </Text>
                      <Text style={{ position: "absolute", left: COLON_X, top: row.y, fontSize: Math.round(26 * SCALE), fontWeight: "900", color: "#111" }}>
                        :
                      </Text>
                      <Text style={{ position: "absolute", left: INFO_X, top: row.y, fontSize: Math.round(26 * SCALE), fontWeight: "700", color: "#111" }}>
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </Modal>
        )}
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

    overlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "center", alignItems: "center", padding: 12,
    },
    modalBox: {
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      borderRadius: 16, padding: 16,
    },
    modalBar: {
      flexDirection: "row", justifyContent: "space-between",
      alignItems: "center", marginBottom: 12,
    },
  });
