import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing } from "@/constants/theme";
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

  // ── Worksites for filter dropdown ────────────────────────────────────────────
  const [worksites, setWorksites] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/worksites`, { headers: await getAuthHeaders() });
        const body = await res.json();
        const list = Array.isArray(body) ? body : body.data ?? [];
        setWorksites(list);
      } catch (e) {
        console.error("Failed to load worksites:", e);
      }
    })();
  }, []);

  // ── Load attendance data ─────────────────────────────────────────────────────
  const loadAttendancesData = async () => {
    try {
      // Use absent-aware endpoint when all 3 filters are set
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

      // Tab filter:
      // IN tab  → show everyone who has a marked_at (clocked-in), including absent synthetic rows
      // OUT tab → show only workers who have been clocked out (out_marked_at is set)
      const tabMatch =
        activeTab === "IN"
          ? (item.status || "").toLowerCase() === "absent" || !!item.marked_at
          : !!item.out_marked_at;

      return searchMatch && shiftMatch && statusMatch && dateMatch && tabMatch;
    });
  }, [attendances, attendanceSearch, attendanceShiftFilter, attendanceStatusFilter, attendanceDateFilter, activeTab]);

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
    backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
    color: isDark ? "#ffffff" : "#333",
    border: `1px solid ${isDark ? "#333" : "#ccc"}`,
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
  };

  return (
    <ThemedView style={styles.container}>
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

          {/* Worksite filter (required for absent logic) */}
          <select
            value={attendanceWorksiteFilter}
            onChange={(e: any) => setAttendanceWorksiteFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="All">All Worksites</option>
            {worksites.map((ws) => (
              <option key={ws.id} value={String(ws.id)}>
                {ws.name}
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

          <input
            type="date"
            value={attendanceDateFilter}
            onChange={(e: any) => setAttendanceDateFilter(e.target.value)}
            style={{
              ...selectStyle,
              colorScheme: isDark ? "dark" : "light",
            }}
          />
        </View>

        {/* Absent info banner for IN tab */}
        {activeTab === "IN" && attendanceWorksiteFilter !== "All" && attendanceDateFilter !== "" && attendanceShiftFilter !== "All" && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              💡 Absent workers (yellow) appear once the shift ends — Morning at 6 PM, Evening at 6 AM next day.
            </Text>
          </View>
        )}

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
                  {activeTab === "IN" && attendanceWorksiteFilter === "All" && (
                    <Text style={[styles.emptyText, { marginTop: 6, fontSize: 12 }]}>
                      Tip: Select a Worksite + Date + Shift to see absent workers.
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
      minWidth: 200,
    },
    searchIcon: { marginRight: 8, fontSize: 16 },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      color: isDark ? "#ffffff" : "#000000",
      outlineStyle: "none",
    },

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
