import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing, rf } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/services/authService";
import { useGoBack } from "@/hooks/use-go-back";

interface Worksite { id: number; name: string; }
interface Hospital { id: number; name: string; }
interface SubSite { id: number; name: string; }
interface BookImage { id: number; sub_site_id: number; book_id: number; image_path: string; created_at: string; }

const BOOK_NAMES: Record<number, string> = { 1: "Hospital Book", 2: "Attendance Book", 3: "Other Documents" };
const BOOK_COLORS: Record<number, string> = { 1: "#4A90D9", 2: "#27AE60", 3: "#E67E22" };

type Level = "worksites" | "hospitals" | "subsites" | "books" | "images";

export default function BooksPage() {
  const goBack = useGoBack();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { token } = useAuth();

  const [level, setLevel] = useState<Level>("worksites");
  const [selectedWorksite, setSelectedWorksite] = useState<Worksite | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedSubSite, setSelectedSubSite] = useState<SubSite | null>(null);

  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [subSites, setSubSites] = useState<SubSite[]>([]);
  const [images, setImages] = useState<BookImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");

  const [previewImage, setPreviewImage] = useState<BookImage | null>(null);
  const [activeBook, setActiveBook] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const authHeaders = useCallback(
    () => ({ Accept: "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const imageUrl = (path: string) => `${API_BASE_URL.replace(/\/api\/?$/, "")}/storage/${path}`;

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (img: BookImage) => {
    const url = imageUrl(img.image_path);
    if (Platform.OS === 'web') {
      try {
        setDownloading(true);
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const filename = img.image_path.split('/').pop() || 'image.jpg';
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (e) {
        alert('Failed to download image.');
      } finally {
        setDownloading(false);
      }
      return;
    }
    
    try {
      setDownloading(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert("Permission needed to save to gallery!");
        return;
      }
      
      const filename = img.image_path.split('/').pop() || `image_${img.id}.jpg`;
      const fileUri = FileSystem.documentDirectory + filename;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      
      await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
      alert('Image saved to gallery!');
    } catch (error) {
      console.error(error);
      alert('Failed to download image.');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch(`${API_BASE_URL}/worksites`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => { setWorksites(Array.isArray(data) ? data : data.data || []); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [token]);

  // HOSPITAL_ID_OFFSET: hospitals.id and sub_sites.id both start from 1,
  // so a bare hospital id can collide with an unrelated sub_site_id
  // (e.g. Castle hospital.id=2 colliding with Razavi sub_site.id=2).
  // Must match the offset used in dashboard/site-actions.tsx.
  const HOSPITAL_ID_OFFSET = 100000;

  const loadImages = async (scopeId: number, type: 'worksite' | 'hospital' | 'subsite' = 'subsite', parentWorksiteId?: number) => {
    const param = type === 'worksite' ? 'worksite_id' : 'sub_site_id';
    const effectiveScopeId = type === 'hospital' ? scopeId + HOSPITAL_ID_OFFSET : scopeId;
    let url = `${API_BASE_URL}/sub-site-images?${param}=${effectiveScopeId}`;
    // When fetching sub-site images, also pass the parent worksite_id to prevent
    // collision when sub-sites of different worksites share the same numeric ID
    if ((type === 'subsite' || type === 'hospital') && parentWorksiteId) {
      url += `&worksite_id=${parentWorksiteId}`;
    }
    const r = await fetch(url, { headers: authHeaders() });
    if (!r.ok) { setImages([]); return; }
    const data = await r.json();
    setImages(Array.isArray(data) ? data : []);
  };

  const selectWorksite = async (ws: Worksite) => {
    setSelectedWorksite(ws); setSelectedHospital(null); setSelectedSubSite(null); setImages([]);
    setIsLoading(true); setLoadingStep("hospitals");
    try {
      const r = await fetch(`${API_BASE_URL}/hospitals?worksite_id=${ws.id}`, { headers: authHeaders() });
      const data = await r.json();
      const list: Hospital[] = Array.isArray(data) ? data : data.data || [];
      if (list.length === 0) { setHospitals([]); setSubSites([]); await loadImages(ws.id, 'worksite'); setLevel("books"); }
      else { setHospitals(list); setLevel("hospitals"); }
    } catch (e) { console.error(e); } finally { setIsLoading(false); setLoadingStep(""); }
  };

  const selectHospital = async (h: Hospital) => {
    setSelectedHospital(h); setSelectedSubSite(null); setImages([]);
    setIsLoading(true); setLoadingStep("subsites");
    try {
      const r = await fetch(`${API_BASE_URL}/sub-sites?hospital_id=${h.id}`, { headers: authHeaders() });
      const data = await r.json();
      const list: SubSite[] = Array.isArray(data) ? data : data.data || [];
      if (list.length === 0) { setSubSites([]); await loadImages(h.id, 'hospital', selectedWorksite?.id); setLevel("books"); }
      else { setSubSites(list); setLevel("subsites"); }
    } catch (e) { console.error(e); } finally { setIsLoading(false); setLoadingStep(""); }
  };

  const selectSubSite = async (s: SubSite) => {
    setSelectedSubSite(s); setIsLoading(true);
    try { await loadImages(s.id, 'subsite', selectedWorksite?.id); setLevel("books"); } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const selectBook = (bookId: number) => {
    setActiveBook(bookId);
    setSelectedDate(null);
    setLevel("images");
  };

  const handleBreadcrumb = (target: Level) => {
    setLevel(target);
    if (target === "worksites") { setSelectedWorksite(null); setSelectedHospital(null); setSelectedSubSite(null); setImages([]); }
    else if (target === "hospitals") { setSelectedHospital(null); setSelectedSubSite(null); setImages([]); }
    else if (target === "subsites") { setSelectedSubSite(null); setImages([]); }
    else if (target === "books") { /* Keep subsite and images */ }
  };

  const handleBack = () => {
    if (level === "worksites") goBack();
    else if (level === "hospitals") handleBreadcrumb("worksites");
    else if (level === "subsites") hospitals.length > 0 ? handleBreadcrumb("hospitals") : handleBreadcrumb("worksites");
    else if (level === "books") {
      if (selectedSubSite) handleBreadcrumb("subsites");
      else if (selectedHospital) hospitals.length > 0 ? handleBreadcrumb("hospitals") : handleBreadcrumb("worksites");
      else handleBreadcrumb("worksites");
    }
    else if (level === "images") {
      handleBreadcrumb("books");
    }
  };

  const filteredImages = images.filter((img) => img.book_id === activeBook);
  const pageTitle = level === "worksites" ? "Books"
    : level === "hospitals" ? selectedWorksite?.name ?? "Books"
    : level === "subsites" ? selectedHospital?.name ?? "Books"
    : level === "books" ? selectedSubSite?.name ?? selectedHospital?.name ?? selectedWorksite?.name ?? "Books"
    : BOOK_NAMES[activeBook] ?? "Images";

  const renderList = (items: { id: number; name: string }[], onSelect: (item: any) => void, emptyMsg: string) => {
    if (isLoading) return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.text} />
        <ThemedText type="small" style={{ marginTop: 12, color: theme.textSecondary }}>
          {loadingStep === "hospitals" ? "Checking hospitals…" : loadingStep === "subsites" ? "Checking sub-sites…" : "Loading…"}
        </ThemedText>
      </View>
    );
    if (items.length === 0) return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>📂</Text>
        <ThemedText type="small" style={styles.emptyText}>{emptyMsg}</ThemedText>
      </View>
    );
    return (
      <ScrollView style={{ flex: 1, width: "100%" }} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <Pressable key={item.id} style={({ pressed }) => [styles.listCard, { backgroundColor: theme.backgroundElement }, pressed && styles.listCardPressed]} onPress={() => onSelect(item)}>
            <ThemedText type="subtitle" style={styles.listCardText}>{item.name}</ThemedText>
            <Text style={styles.listCardChevron}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  const renderBooks = () => {
    if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={theme.text} /></View>;
    return (
      <ScrollView style={{ flex: 1, width: "100%" }} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {[1, 2, 3].map((bid) => {
          const count = images.filter((img) => img.book_id === bid).length;
          return (
            <Pressable key={bid} style={({ pressed }) => [styles.listCard, { backgroundColor: theme.backgroundElement }, pressed && styles.listCardPressed]} onPress={() => selectBook(bid)}>
              <View style={[styles.bookDot, { backgroundColor: BOOK_COLORS[bid] }]} />
              <ThemedText type="subtitle" style={[styles.listCardText, { marginLeft: 12 }]}>{BOOK_NAMES[bid]}</ThemedText>
              {count > 0 && <View style={[styles.bookBadge, { backgroundColor: BOOK_COLORS[bid], marginRight: 8 }]}><Text style={styles.bookBadgeText}>{count}</Text></View>}
              <Text style={styles.listCardChevron}>›</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  };

  const renderImages = () => {
    if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={theme.text} /></View>;

    const allBookImages = images.filter((img) => img.book_id === activeBook);
    const availableDates = Array.from(new Set(allBookImages.map(img => {
      const d = new Date(img.created_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const displayImages = selectedDate ? allBookImages.filter(img => {
      const d = new Date(img.created_at);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dStr === selectedDate;
    }) : allBookImages;

    const handleDateChange = (event: any, date?: Date) => {
      setShowDatePicker(false);
      if (date) {
        const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        setSelectedDate(dStr);
      }
    };

    return (
      <View style={{ flex: 1, width: "100%" }}>
        <View style={{ flexGrow: 0, flexShrink: 0, height: 40, marginBottom: 12 }}>
          <View style={[styles.dateRow, { paddingHorizontal: Spacing.four }]}>
            <Pressable onPress={() => setSelectedDate(null)} style={[styles.dateChip, selectedDate === null && { backgroundColor: theme.text }]}>
              <Text style={[styles.dateChipText, selectedDate === null && { color: theme.background }]}>All Dates</Text>
            </Pressable>
            {Platform.OS === 'web' ? (
              require('react').createElement('div', { style: { position: 'relative' } },
                require('react').createElement('input', {
                  type: 'date',
                  value: selectedDate || '',
                  onChange: (e: any) => {
                    const val = e.target.value;
                    if (val) {
                      const d = new Date(val);
                      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      setSelectedDate(dStr);
                    }
                  },
                  style: {
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: '1px solid rgba(150,150,150,0.2)',
                    backgroundColor: selectedDate !== null ? theme.text : "rgba(150,150,150,0.15)",
                    color: selectedDate !== null ? theme.background : "#888",
                    fontSize: '13px',
                    fontWeight: '600',
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }
                }),
                !selectedDate && require('react').createElement('span', {
                  style: {
                    position: 'absolute',
                    left: 16,
                    top: 9,
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#888',
                    pointerEvents: 'none'
                  }
                }, 'mm/dd/yyyy')
              )
            ) : (
              <Pressable onPress={() => setShowDatePicker(true)} style={[styles.dateChip, selectedDate !== null && { backgroundColor: theme.text }]}>
                <Text style={[styles.dateChipText, selectedDate !== null && { color: theme.background }]}>
                  {selectedDate ? new Date(selectedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Select Date 📅"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {showDatePicker && Platform.OS !== 'web' && (
          <DateTimePicker
            value={selectedDate ? new Date(selectedDate) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
        
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.feedScrollContent} showsVerticalScrollIndicator={false}>
          {displayImages.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>🖼️</Text>
              <ThemedText type="small" style={styles.emptyText}>No images found for this selection.</ThemedText>
            </View>
          ) : (
            <View style={styles.feedContainer}>
              {displayImages.map((img) => (
                <View key={img.id} style={[styles.feedCard, { backgroundColor: theme.backgroundElement }]}> 
                  <Pressable style={styles.feedImageContainer} onPress={() => setPreviewImage(img)}>
                    <Image source={{ uri: imageUrl(img.image_path) }} style={styles.feedImage} resizeMode="cover" />
                  </Pressable>
                  <View style={styles.feedFooter}>
                    <Text style={[styles.feedDate, { color: theme.textSecondary }]}>{new Date(img.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</Text>
                    <Pressable style={styles.downloadBtn} onPress={() => handleDownload(img)} disabled={downloading}>
                      <Text style={styles.downloadBtnText}>⬇ Download</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]}>
      <View style={[styles.bgFill, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]} />
      <View style={[styles.bgCircleLarge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.65)" }]} />
      <View style={[styles.bgCircleSmall, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.5)" }]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backBtn, { backgroundColor: theme.backgroundElement }]} onPress={handleBack}>
            <ThemedText type="smallBold">←</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>{pageTitle}</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {level !== "worksites" && level !== "images" && (
          <View style={{ flexGrow: 0, flexShrink: 0, height: 32, marginBottom: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbScroll} contentContainerStyle={styles.breadcrumbRow}>
              <Pressable onPress={() => handleBreadcrumb("worksites")}>
                <Text style={[styles.breadcrumbItem, { color: isDark ? "#888" : "#999" }]}>All Sites</Text>
              </Pressable>
              {selectedWorksite && (
                <>
                  <Text style={[styles.breadcrumbSep, { color: isDark ? "#555" : "#bbb" }]}> › </Text>
                  <Pressable onPress={() => level !== "hospitals" && hospitals.length > 0 ? handleBreadcrumb("hospitals") : undefined}>
                    <Text style={[styles.breadcrumbItem, { color: level === "hospitals" ? theme.text : isDark ? "#888" : "#999", fontWeight: level === "hospitals" ? "700" : "500" }]}>{selectedWorksite.name}</Text>
                  </Pressable>
                </>
              )}
              {selectedHospital && (
                <>
                  <Text style={[styles.breadcrumbSep, { color: isDark ? "#555" : "#bbb" }]}> › </Text>
                  <Pressable onPress={() => level !== "subsites" && subSites.length > 0 ? handleBreadcrumb("subsites") : undefined}>
                    <Text style={[styles.breadcrumbItem, { color: level === "subsites" ? theme.text : isDark ? "#888" : "#999", fontWeight: level === "subsites" ? "700" : "500" }]}>{selectedHospital.name}</Text>
                  </Pressable>
                </>
              )}
              {selectedSubSite && (
                <>
                  <Text style={[styles.breadcrumbSep, { color: isDark ? "#555" : "#bbb" }]}> › </Text>
                  <Pressable onPress={() => level !== "books" ? handleBreadcrumb("books") : undefined}>
                    <Text style={[styles.breadcrumbItem, { color: level === "books" ? theme.text : isDark ? "#888" : "#999", fontWeight: level === "books" ? "700" : "500" }]}>{selectedSubSite.name}</Text>
                  </Pressable>
                </>
              )}
              {/* Add explicit trailing spacing to prevent text cut-off when fully scrolled */}
              <View style={{ width: 40 }} />
            </ScrollView>
          </View>
        )}

        <View style={styles.content}>
          {level === "worksites" && renderList(worksites, selectWorksite, "No worksites found.")}
          {level === "hospitals" && renderList(hospitals, selectHospital, "No hospitals found.")}
          {level === "subsites" && renderList(subSites, selectSubSite, "No sub-sites found.")}
          {level === "books" && renderBooks()}
          {level === "images" && renderImages()}
        </View>
      </SafeAreaView>

      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalCloseBtn} onPress={() => setPreviewImage(null)}>
            <Text style={styles.modalCloseText}>✕</Text>
          </Pressable>
          {previewImage && (
            <>
              <Image source={{ uri: imageUrl(previewImage.image_path) }} style={styles.modalImage} resizeMode="contain" />
              <View style={styles.modalMeta}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={[styles.modalBookBadge, { backgroundColor: BOOK_COLORS[previewImage.book_id] }]}>
                    <Text style={styles.modalBookText}>{BOOK_NAMES[previewImage.book_id]}</Text>
                  </View>
                  <Pressable style={styles.modalDownloadBtn} onPress={() => handleDownload(previewImage)} disabled={downloading}>
                    <Text style={styles.modalDownloadText}>{downloading ? "..." : "Download"}</Text>
                  </Pressable>
                </View>
                <Text style={styles.modalDateText}>{new Date(previewImage.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgFill: { ...StyleSheet.absoluteFillObject },
  bgCircleLarge: { position: "absolute", width: Platform.select({ web: 280, default: 420 }), height: Platform.select({ web: 280, default: 420 }), borderRadius: Platform.select({ web: 140, default: 210 }), top: -160, right: -90 },
  bgCircleSmall: { position: "absolute", width: Platform.select({ web: 180, default: 260 }), height: Platform.select({ web: 180, default: 260 }), borderRadius: Platform.select({ web: 90, default: 130 }), bottom: -100, left: -80 },
  safeArea: { flex: 1, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center", paddingBottom: BottomTabInset + Spacing.three, paddingTop: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, paddingHorizontal: Spacing.four, gap: Spacing.two },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  pageTitle: { flex: 1, textAlign: "center" },
  breadcrumbScroll: { flex: 1, paddingHorizontal: Spacing.four },
  breadcrumbRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  breadcrumbItem: { fontSize: rf(13, 11, 15), fontWeight: "500" },
  breadcrumbSep: { fontSize: 13, marginHorizontal: 4 },
  content: { flex: 1, width: "100%" },
  listContent: { paddingHorizontal: Spacing.four, paddingTop: 0, paddingBottom: Spacing.four, gap: 12 },
  listCard: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: Spacing.four, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5, minHeight: 64 },
  listCardPressed: { opacity: 0.85 },
  listCardText: { flex: 1, fontSize: rf(18, 14, 22) },
  listCardChevron: { fontSize: 26, color: "#aaa", marginLeft: 8 },
  dateScroll: { flex: 1, paddingHorizontal: Spacing.four },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(150,150,150,0.15)", borderWidth: 1, borderColor: "rgba(150,150,150,0.2)" },
  dateChipText: { fontSize: 13, fontWeight: "600", color: "#888" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { textAlign: "center", color: "#999", maxWidth: 280 },
  bookDot: { width: 10, height: 10, borderRadius: 5 },
  bookBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bookBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  feedScrollContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, paddingTop: Spacing.two },
  feedContainer: { flexDirection: "column", gap: 16 },
  feedCard: { borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  feedImageContainer: { width: "100%", aspectRatio: 4 / 3, backgroundColor: "#e0e0e0" },
  feedImage: { width: "100%", height: "100%" },
  feedFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
  feedDate: { fontSize: 13, fontWeight: "500" },
  downloadBtn: { backgroundColor: "#f0f0f0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  downloadBtnText: { fontSize: 12, fontWeight: "600", color: "#333" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  modalCloseBtn: { position: "absolute", top: Platform.select({ web: 20, default: 55 }), right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  modalCloseText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  modalImage: { width: "92%", height: "65%", borderRadius: 16 },
  modalMeta: { marginTop: 20, alignItems: "center", gap: 12 },
  modalBookBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  modalBookText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  modalDownloadBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: "#fff" },
  modalDownloadText: { color: "#000", fontWeight: "700", fontSize: 13 },
  modalDateText: { color: "#ccc", fontSize: 12 },
});