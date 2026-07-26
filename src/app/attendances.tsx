import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { BackgroundPattern } from '@/components/BackgroundPattern';
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing, MaxContentWidth } from "@/constants/theme";

import { useTheme } from "@/hooks/use-theme";
import * as AttendancesService from "@/services/adminAttendancesService";
import { useGoBack } from "@/hooks/use-go-back";
import { API_BASE_URL, getAuthHeaders } from "@/services/authService";

export default function AttendancesPage() {
  const goBack = useGoBack();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = useMemo(() => createStyles(isDark), [isDark]);

  // ── Tab: IN (mark-in records + absent) | OUT (marked-out records) ──────────
  const [activeTab, setActiveTab] = useState<"IN" | "OUT">("IN");

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [attendances, setAttendances] = useState<AttendancesService.AttendanceRecord[]>([]);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceShiftFilter, setAttendanceShiftFilter] = useState("All");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("All");
  const [attendanceDateFilter, setAttendanceDateFilter] = useState("");
  const [attendanceWorksiteFilter, setAttendanceWorksiteFilter] = useState("All");

  // ── Cascading location filter: Main Site → Hospital → Sub Site ──────────────
  const [mainSites, setMainSites] = useState<{ id: number; name: string }[]>([]);
  const [hospitals, setHospitals] = useState<{ id: number; name: string; worksite_id: number }[]>([]);
  const [subSites, setSubSites] = useState<{ id: number; name: string; hospital_id: number }[]>([]);

  const [selectedMainSite, setSelectedMainSite] = useState<string>("All");
  const [selectedHospital, setSelectedHospital] = useState<string>("All");
  const [selectedSubSite, setSelectedSubSite] = useState<string>("All");

  // Derived lists filtered by parent selection
  const filteredHospitals = hospitals.filter(
    (h) => selectedMainSite === "All" || String(h.worksite_id) === selectedMainSite
  );
  const filteredSubSites = subSites.filter(
    (s) => selectedHospital === "All" || String(s.hospital_id) === selectedHospital
  );

  // Keep old worksite filter in sync with the cascading selection
  // (absent-logic still uses worksite_id / main-site level)
  useEffect(() => {
    setAttendanceWorksiteFilter(selectedMainSite);
  }, [selectedMainSite]);

  // Load all main sites once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/worksites`, { headers: await getAuthHeaders() });
        const body = await res.json();
        setMainSites(Array.isArray(body) ? body : body.data ?? []);
      } catch (e) {
        console.error("Failed to load main sites:", e);
      }
    })();
  }, []);

  // Load all hospitals once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/hospitals`, { headers: await getAuthHeaders() });
        const body = await res.json();
        setHospitals(Array.isArray(body) ? body : body.data ?? []);
      } catch (e) {
        console.error("Failed to load hospitals:", e);
      }
    })();
  }, []);

  // Load all sub-sites once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/sub-sites`, { headers: await getAuthHeaders() });
        const body = await res.json();
        setSubSites(Array.isArray(body) ? body : body.data ?? []);
      } catch (e) {
        console.error("Failed to load sub-sites:", e);
      }
    })();
  }, []);

  // Reset child selections when parent changes
  const handleMainSiteChange = (value: string) => {
    setSelectedMainSite(value);
    setSelectedHospital("All");
    setSelectedSubSite("All");
  };
  const handleHospitalChange = (value: string) => {
    setSelectedHospital(value);
    setSelectedSubSite("All");
  };
  const handleSubSiteChange = (value: string) => {
    setSelectedSubSite(value);
  };

  // ── Load attendance data ─────────────────────────────────────────────────────
  const loadAttendancesData = async () => {
    try {
      // Use absent-aware endpoint when all 3 filters are set (main site level)
      if (
        attendanceWorksiteFilter !== "All" &&
        attendanceDateFilter !== "" &&
        attendanceShiftFilter !== "All"
      ) {
        const data = await AttendancesService.getAttendancesWithAbsents({
          worksiteId: attendanceWorksiteFilter,
          date: attendanceDateFilter,
          shift: attendanceShiftFilter,
        });
        setAttendances(data);
      } else {
        const data = await AttendancesService.getAttendances();
        setAttendances(data);
      }
    } catch (error) {
      console.error("Failed to load attendances:", error);
    }
  };

  // Reload whenever the key absent-logic filters change
  useEffect(() => {
    loadAttendancesData();
  }, [attendanceWorksiteFilter, attendanceDateFilter, attendanceShiftFilter]);

  // ── Filtered data ────────────────────────────────────────────────────────────
  const filteredAttendanceData = useMemo(() => {
    return attendances.filter((item) => {
      const searchMatch =
        attendanceSearch.trim() === "" ||
        (item.worker?.name || "").toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        String(item.id).includes(attendanceSearch);

      const shiftMatch =
        attendanceShiftFilter === "All" || item.shift === attendanceShiftFilter;

      const statusMatch =
        attendanceStatusFilter === "All" ||
        (item.status || "").toLowerCase() === attendanceStatusFilter.toLowerCase();

      const dateMatch =
        attendanceDateFilter === "" ||
        (item.date && item.date.startsWith(attendanceDateFilter));

      // ── Cascading location filter ───────────────────────────────────────────
      // Main site: handled server-side via worksite_id (attendanceWorksiteFilter).
      // Hospital: two-layer check for backwards compatibility:
      //   1. New records (after migration): match via hospital_id directly.
      //   2. Old records (hospital_id = null): fall back to sub_site_id membership
      //      so records created before the migration are not silently hidden.
      const hospitalSubSiteIds = filteredSubSites.map((s) => String(s.id));
      const hospitalMatch =
        selectedHospital === "All" ||
        // New records: direct hospital_id match
        String(item.hospital_id) === selectedHospital ||
        // Old records fallback: hospital_id is null but sub_site belongs to this hospital
        (item.hospital_id == null &&
          item.sub_site_id != null &&
          hospitalSubSiteIds.includes(String(item.sub_site_id)));

      // Sub-site: further narrow within the hospital.
      const subSiteMatch =
        selectedSubSite === "All" ||
        String(item.sub_site_id) === selectedSubSite;

      // Tab filter:
      // IN tab  → show everyone who has a marked_at (clocked-in), including absent synthetic rows
      // OUT tab → show only workers who have been clocked out (out_marked_at is set)
      const tabMatch =
        activeTab === "IN"
          ? (item.status || "").toLowerCase() === "absent" || !!item.marked_at
          : !!item.out_marked_at;

      return searchMatch && shiftMatch && statusMatch && dateMatch && hospitalMatch && subSiteMatch && tabMatch;
    });
  }, [attendances, attendanceSearch, attendanceShiftFilter, attendanceStatusFilter, attendanceDateFilter, activeTab, selectedHospital, selectedSubSite, filteredSubSites]);

  // ── Status colour helper ─────────────────────────────────────────────────────
  function statusColor(status: string) {
    const s = (status || "").toLowerCase();
    if (s === "present") return "#28a745";
    if (s === "late") return "#ff4d4f";
    if (s === "absent") return "#faad14"; // yellow for absent
    return "#6b7280";
  }

  function statusLabel(status: string) {
    const s = (status || "").toLowerCase();
    if (s === "present") return "Present";
    if (s === "late") return "Late";
    if (s === "absent") return "Absent";
    return status;
  }

  // Returns true if the worker clocked out BEFORE their shift end time
  function isEarlyOut(item: any): boolean {
    if (!item.out_marked_at) return false;
    const shiftName = (item.shift || "").toLowerCase();
    const outTime = new Date(item.out_marked_at);
    const shiftEndHour = shiftName === "morning" ? 18 : 6; // Morning ends 18:00, Evening ends 06:00
    const outHour = outTime.getHours();
    const outMinutes = outTime.getMinutes();
    if (shiftName === "morning") {
      // Early if out before 18:00
      return outHour < shiftEndHour || (outHour === shiftEndHour && outMinutes === 0);
    } else {
      // Evening/Night: shift ends next day at 06:00. Early if out before 06:00 same day
      return outHour < shiftEndHour;
    }
  }

  const selectStyle: any = {
    backgroundColor: theme.backgroundSelected,
    color: theme.text,
    border: `1px solid ${theme.border || "#ccc"}`,
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <BackgroundPattern />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonIcon}>‹</Text>
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>
            Attendances
          </ThemedText>
        </View>

        {/* IN / OUT Tab Toggle */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, activeTab === "IN" && styles.tabActive]}
            onPress={() => setActiveTab("IN")}
          >
            <Text style={[styles.tabText, activeTab === "IN" && styles.tabTextActive]}>
              ↩ Clock-IN
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "OUT" && styles.tabActive]}
            onPress={() => setActiveTab("OUT")}
          >
            <Text style={[styles.tabText, activeTab === "OUT" && styles.tabTextActive]}>
              ↪ Clock-OUT
            </Text>
          </Pressable>
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={attendanceSearch}
              onChangeText={setAttendanceSearch}
              placeholder="Search by worker or ID"
              placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
              style={styles.searchInput}
            />
          </View>

          {/* ── Cascading location filter ─────────────────────────────────── */}
          {/* Level 1: Main Site */}
          <select
            value={selectedMainSite}
            onChange={(e: any) => handleMainSiteChange(e.target.value)}
            style={selectStyle}
          >
            <option value="All">All Main Sites</option>
            {mainSites.map((ws) => (
              <option key={ws.id} value={String(ws.id)}>
                {ws.name}
              </option>
            ))}
          </select>

          {/* Level 2: Hospital (shown only when a main site is selected) */}
          <select
            value={selectedHospital}
            onChange={(e: any) => handleHospitalChange(e.target.value)}
            style={{
              ...selectStyle,
              opacity: selectedMainSite === "All" ? 0.5 : 1,
            }}
            disabled={selectedMainSite === "All"}
          >
            <option value="All">
              {selectedMainSite === "All" ? "— Select Main Site first —" : "All Hospitals"}
            </option>
            {filteredHospitals.map((h) => (
              <option key={h.id} value={String(h.id)}>
                {h.name}
              </option>
            ))}
          </select>

          {/* Level 3: Sub Site (shown only when a hospital is selected and has sub-sites) */}
          <select
            value={selectedSubSite}
            onChange={(e: any) => handleSubSiteChange(e.target.value)}
            style={{
              ...selectStyle,
              opacity: (selectedHospital === "All" || filteredSubSites.length === 0) ? 0.5 : 1,
            }}
            disabled={selectedHospital === "All" || filteredSubSites.length === 0}
          >
            <option value="All">
              {selectedHospital === "All"
                ? "— Select Hospital first —"
                : filteredSubSites.length === 0
                ? "No sub-sites"
                : "All Sub Sites"}
            </option>
            {filteredSubSites.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={attendanceShiftFilter}
            onChange={(e: any) => setAttendanceShiftFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="All">All Shifts</option>
            <option value="Morning">Morning</option>
            <option value="Evening">Evening</option>
          </select>

          <select
            value={attendanceStatusFilter}
            onChange={(e: any) => setAttendanceStatusFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="All">All Status</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>

            <View style={{ position: 'relative', minWidth: 140 }}>
              <input
                type="date"
                value={attendanceDateFilter}
                onChange={(e: any) => setAttendanceDateFilter(e.target.value)}
                style={{
                  ...selectStyle,
                  colorScheme: isDark ? "dark" : "light",
                  minWidth: 140,
                  minHeight: 40,
                  display: 'block',
                }}
              />
              {!attendanceDateFilter && (
                <Text
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: 10,
                    fontSize: 14,
                    color: isDark ? '#888' : '#999',
                  }}
                >
                  mm/dd/yyyy
                </Text>
              )}
            </View>
        </View>

        {/* Absent info banner for IN tab */}
        {activeTab === "IN" && selectedMainSite !== "All" && attendanceDateFilter !== "" && attendanceShiftFilter !== "All" && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              💡 Absent workers (yellow) appear once the shift ends — Morning at 6 PM, Evening at 6 AM next day.
            </Text>
          </View>
        )}

        {/* Record count summary */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 4, paddingBottom: 4 }}>
          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 }}>
            <Text style={{ color: isDark ? '#e2e8f0' : '#374151', fontSize: 13, fontWeight: '600' }}>
              {filteredAttendanceData.length} record{filteredAttendanceData.length !== 1 ? 's' : ''} shown
            </Text>
          </View>
        </View>

        {/* Table */}
        <ScrollView style={styles.tableScrollContainer} showsVerticalScrollIndicator nestedScrollEnabled>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={[styles.tableCard, { minWidth: 620 }]}>
              {/* Header */}
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>ID</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Worker</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Date</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Shift</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                  {activeTab === "OUT" ? "Clocked Out" : "Marked At"}
                </Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Status</Text>
              </View>

              {filteredAttendanceData.map((item, index) => {
                const isAbsent = (item.status || "").toLowerCase() === "absent";
                return (
                  <View
                    key={String(item.id)}
                    style={[
                      styles.tableRow,
                      isAbsent && styles.absentRow,
                      index !== filteredAttendanceData.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? "#2a2a2a" : "#e5e7eb",
                      },
                    ]}
                  >
                    <Text style={[styles.tableCell, { flex: 1 }]}>{item.id}</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>
                      {item.worker?.name || `Worker #${item.worker_id}`}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>
                      {item.date ? item.date.split("T")[0] : "—"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{item.shift}</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>
                      {activeTab === "OUT"
                        ? item.out_marked_at
                          ? new Date(item.out_marked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"
                        : item.marked_at
                        ? new Date(item.marked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </Text>
                    {(() => {
                      // OUT tab: override display status to "Early" if worker left before shift end
                      if (activeTab === "OUT" && isEarlyOut(item)) {
                        return (
                          <Text style={[styles.tableCell, { flex: 2, color: "#fa8c16", fontWeight: "600" }]}>
                            Early
                          </Text>
                        );
                      }
                      return (
                        <Text style={[styles.tableCell, { flex: 2, color: statusColor(item.status || ""), fontWeight: "600" }]}>
                          {statusLabel(item.status || "")}
                        </Text>
                      );
                    })()}
                  </View>
                );
              })}

              {filteredAttendanceData.length === 0 && (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>No matching attendances found.</Text>
                  {activeTab === "IN" && selectedMainSite === "All" && (
                    <Text style={[styles.emptyText, { marginTop: 6, fontSize: 12 }]}>
                      Tip: Select a Main Site + Date + Shift to see absent workers.
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.four,
      paddingBottom: BottomTabInset,
      backgroundColor: isDark ? "#121212" : "#f5f5f5",
      maxWidth: MaxContentWidth,
      width: '100%',
      alignSelf: 'center',
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      marginTop: 20,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? "#2a2a2a" : "#e5e5ea",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 15,
    },
    backButtonIcon: {
      fontSize: 24,
      color: isDark ? "#ffffff" : "#000000",
      lineHeight: 28,
    },
    title: { fontSize: 24, fontWeight: "bold" },

    // ── Tabs ───────────────────────────────────────────────────────────────────
    tabRow: {
      flexDirection: "row",
      marginBottom: 14,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: isDark ? "#1e1e1e" : "#e5e5ea",
      alignSelf: "flex-start",
    },
    tab: {
      paddingVertical: 8,
      paddingHorizontal: 20,
    },
    tabActive: {
      backgroundColor: isDark ? "#4b4fbf" : "#4b4fbf",
      borderRadius: 10,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      color: isDark ? "#a0a0a0" : "#555",
    },
    tabTextActive: {
      color: "#ffffff",
    },

    // ── Filters ────────────────────────────────────────────────────────────────
    filtersRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 12,
      zIndex: 1,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#1e1e1e" : "#e0e0e0",
      borderRadius: 12,
      paddingHorizontal: 12,
      minWidth: 160,
      flex: 1,
    },
    searchIcon: { marginRight: 8, fontSize: 16 },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      color: isDark ? "#ffffff" : "#000000",
      outlineStyle: "none",
    } as any,


    // ── Info Banner ────────────────────────────────────────────────────────────
    infoBanner: {
      backgroundColor: isDark ? "#2a2a1a" : "#fffbe6",
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      borderLeftWidth: 3,
      borderLeftColor: "#faad14",
    },
    infoBannerText: {
      color: isDark ? "#e6c97a" : "#7a5c00",
      fontSize: 12,
    },

    // ── Table ──────────────────────────────────────────────────────────────────
    tableScrollContainer: { flex: 1 },
    tableCard: {
      backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
      borderRadius: 16,
      overflow: "hidden",
      ...Platform.select({
        web: {
          boxShadow: isDark
            ? "0 4px 6px rgba(0,0,0,0.3)"
            : "0 4px 6px rgba(0,0,0,0.05)",
        },
      }),
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    tableHeaderRow: {
      backgroundColor: isDark ? "#2a2a2a" : "#f8f9fa",
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#333333" : "#e5e7eb",
    },
    tableHeaderCell: {
      fontWeight: "600",
      fontSize: 14,
      color: isDark ? "#b0b0b0" : "#6b7280",
    },
    tableCell: {
      fontSize: 14,
      color: isDark ? "#ffffff" : "#374151",
    },
    absentRow: {
      backgroundColor: isDark ? "#2a2000" : "#fffbe6",
    },
    emptyRow: {
      padding: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      color: isDark ? "#b0b0b0" : "#6b7280",
      fontSize: 14,
      textAlign: "center",
    },
  });
