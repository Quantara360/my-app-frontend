import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BackgroundPattern } from "@/components/BackgroundPattern";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Camera } from "expo-camera";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, SafeAreaView, StyleSheet, View, ScrollView, Text } from 'react-native';
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/services/authService";
import { useGoBack } from "@/hooks/use-go-back";
import {  } from "react-native";

export default function MarkAttendance() {
  const router = useRouter();
  const goBack = useGoBack();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { worksiteId, hospitalId, subSiteId, shift: paramShift, state: paramState } = useLocalSearchParams<{ worksiteId?: string; hospitalId?: string; subSiteId?: string; shift?: string; state?: string }>();
  console.log('[mark-attendance] params:', { worksiteId, hospitalId, subSiteId, paramShift, paramState });
  const { token } = useAuth();
  const [date, setDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = currentTime.getHours();
  const minute = currentTime.getMinutes();

  // The day is 6 back-to-back windows. The two "changeover" windows (dawn
  // and dusk) are where the outgoing shift's on-time OUT and the incoming
  // shift's on-time IN overlap in the same clock hours, so which one
  // actually applies is genuinely ambiguous and the toggle picks between
  // them. The other four windows are unambiguous (Late Attendance / Early
  // Out for whichever shift is currently running), so there's nothing to
  // toggle there.
  let derivedShift: "Morning" | "Evening";
  let derivedState: "IN" | "OUT";
  let isLate = false;
  let isEarlyOut = false;
  let canToggle = false;

  if (hour >= 5 && hour < 7) {
    // 5:00-6:59AM: Day on-time IN <-> Night on-time OUT
    derivedShift = "Morning";
    derivedState = "IN";
    canToggle = true;
  } else if (hour >= 7 && hour < 12) {
    // 7:00-11:59AM: Day shift, late attendance
    derivedShift = "Morning";
    derivedState = "IN";
    isLate = true;
  } else if (hour >= 12 && hour < 17) {
    // 12:00-4:59PM: Day shift, early out
    derivedShift = "Morning";
    derivedState = "OUT";
    isEarlyOut = true;
  } else if (hour >= 17 && hour < 19) {
    // 5:00-6:59PM: Night on-time IN <-> Day on-time OUT
    derivedShift = "Evening";
    derivedState = "IN";
    canToggle = true;
  } else if (hour >= 19) {
    // 7:00-11:59PM: Night shift, late attendance
    derivedShift = "Evening";
    derivedState = "IN";
    isLate = true;
  } else {
    // 12:00-4:59AM: Night shift, early out
    derivedShift = "Evening";
    derivedState = "OUT";
    isEarlyOut = true;
  }

  // manualCombo: null = use the clock-derived default; "alt" = the other
  // half of a changeover window (Day IN <-> Night OUT, or Night IN <-> Day
  // OUT — flipping shift AND state together, since that's the only other
  // valid combo in either changeover window). Only meaningful while
  // canToggle is true.
  const [manualCombo, setManualCombo] = useState<"alt" | null>(null);

  // Drop a stale override the moment the clock leaves a changeover window,
  // so it can't leak into an unrelated (unambiguous) window.
  useEffect(() => {
    if (!canToggle) setManualCombo(null);
  }, [canToggle]);

  const useAlt = canToggle && manualCombo === "alt";
  const effectiveShift = useAlt ? (derivedShift === "Morning" ? "Evening" : "Morning") : derivedShift;
  const effectiveState = useAlt ? (derivedState === "IN" ? "OUT" : "IN") : derivedState;

  const toggleCombo = () => {
    if (!canToggle) return;
    setManualCombo(prev => (prev === "alt" ? null : "alt"));
  };

  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token || !worksiteId) return;
    const fetchWorkers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/workers`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        });
        const data = await res.json();
        const loadedWorkers = Array.isArray(data) ? data : data.data || [];
        setWorkers(loadedWorkers.filter((w: any) => String(w.worksite_id) === String(worksiteId)));
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkers();
  }, [token, worksiteId]);

  const toggleWorker = (id: number) => {
    setSelectedWorkers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formattedDate = date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]}>
      <BackgroundPattern />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={{ overscrollBehavior: 'none' } as any}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
        <View style={styles.headerRow}>
          <ThemedText type="title" style={styles.title}>
            Mark Attendance
          </ThemedText>
        </View>

        <View style={styles.cardWrap}>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {isLate && (
              <ThemedText type="subtitle" style={{ color: "red", marginBottom: 10, textAlign: "center", fontWeight: "bold" }}>
                Late Attendance
              </ThemedText>
            )}
            {isEarlyOut && (
              <ThemedText type="subtitle" style={{ color: "orange", marginBottom: 10, textAlign: "center", fontWeight: "bold" }}>
                Early Out
              </ThemedText>
            )}
            {useAlt && (
              <ThemedText type="subtitle" style={{ color: "#888", marginBottom: 10, textAlign: "center", fontWeight: "bold" }}>
                Late Out — {effectiveShift === "Morning" ? "Day Shift" : "Night Shift"}
              </ThemedText>
            )}
            <ThemedText type="subtitle" style={[styles.cardTitle, { backgroundColor: theme.background }]}>
              Enter Details
            </ThemedText>

            <View style={styles.formRow}>
              <ThemedText type="small">Shift:</ThemedText>
              <Pressable
                style={[styles.pill, {
                  backgroundColor: useAlt ? "#6c63ff" : theme.background,
                  opacity: canToggle ? 1 : 0.6,
                }]}
                onPress={toggleCombo}
                disabled={!canToggle}
              >
                <ThemedText type="small" style={useAlt ? { color: "#fff", fontWeight: "bold" } : {}}>
                  {effectiveShift === "Morning" ? "Day Shift" : "Night Shift"}
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.formRow}>
              <ThemedText type="small">Date:</ThemedText>
              <Pressable
                style={[styles.pill, { backgroundColor: theme.background }]}
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText type="small">{formattedDate}</ThemedText>
              </Pressable>
            </View>

            <View style={styles.formRow}>
              <ThemedText type="small">State:</ThemedText>
              <Pressable
                style={[styles.pill, {
                  backgroundColor: effectiveState === "IN" ? "#28a745" : "#dc3545",
                  alignItems: "center",
                  opacity: canToggle ? 1 : 0.6,
                }]}
                onPress={toggleCombo}
                disabled={!canToggle}
              >
                <ThemedText type="small" style={{ color: "#fff", fontWeight: "bold" }}>{effectiveState}</ThemedText>
              </Pressable>
            </View>

            {showDatePicker && (
              <>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onDateChange}
                />
                {Platform.OS === "ios" && (
                  <Pressable onPress={() => setShowDatePicker(false)} style={{ alignSelf: "flex-end", padding: 8 }}>
                    <ThemedText type="small" style={{ color: theme.text, fontWeight: "600" }}>Done</ThemedText>
                  </Pressable>
                )}
              </>
            )}

            {workers.length > 0 && (
              <View style={styles.workersSection}>
                <ThemedText type="smallBold" style={styles.workersSectionTitle}>Select Workers:</ThemedText>
                <View style={styles.workersListWrapper}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {workers.map(worker => {
                      const isSelected = selectedWorkers.has(worker.id);
                      return (
                        <Pressable
                          key={worker.id}
                          style={[
                            styles.workerItem,
                            { borderBottomColor: isDark ? '#333' : '#e2e8f0' },
                            isSelected && { backgroundColor: theme.backgroundSelected }
                          ]}
                          onPress={() => toggleWorker(worker.id)}
                        >
                          <View style={[styles.checkbox, isSelected && { backgroundColor: '#28a745', borderColor: '#28a745' }]}>
                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                          <ThemedText type="small">{worker.name}</ThemedText>
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                </View>
              </View>
            )}

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.button, styles.prevButton]}
                onPress={goBack}
              >
                <ThemedText type="smallBold">&lt;&lt; Previous</ThemedText>
              </Pressable>

              <Pressable
                style={[styles.button, styles.nextButton]}
                onPress={async () => {
                  const { status } =
                    await Camera.requestCameraPermissionsAsync();
                  if (status === "granted") {
                    router.push({
                      pathname: "/face-recognition" as any,
                      params: {
                        worksiteId: String(worksiteId || ""),
                        hospitalId: String(hospitalId || ""),
                        subSiteId: String(subSiteId || ""),
                        shift: effectiveShift,
                        state: effectiveState,
                      },
                    });
                  } else {
                    Alert.alert(
                      "Camera permission required",
                      "This feature needs camera access. Please allow camera permission.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Open Settings",
                          onPress: () => Linking.openSettings(),
                        },
                      ],
                    );
                  }
                }}
              >
                <ThemedText type="smallBold" style={{ color: "#fff" }}>
                  Next &gt;&gt;
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: Platform.OS === "web" ? "row" : "column",
    overflow: 'hidden',
  },

  safeArea: {
    flex: 1,
    // alignSelf: 'stretch', not 'center' - container is flexDirection:
    // "row" (web) for the desktop-max-width-centering pattern, which makes
    // the cross axis here VERTICAL. alignSelf: 'center' sized this box to
    // its own content height and centered it within container's full
    // height instead of filling it, leaving blank space above/below on any
    // screen taller than the content (see dashboard/index.tsx for the
    // same bug). Horizontal centering still comes from container's
    // justifyContent: 'center' plus this box's own maxWidth/width: '100%'.
    paddingHorizontal: Spacing.four,
    justifyContent: "flex-start",
    alignItems: "center",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'stretch',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    textAlign: "center",
  },
  cardWrap: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
  },
  card: {
    width: "92%",
    backgroundColor: "#f3f3f5",
    borderRadius: 18,
    padding: Spacing.four,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardTitle: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "stretch",
    textAlign: "center",
    marginBottom: 18,
    alignItems: "center",
  },
  formRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  pill: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    minWidth: 140,
    alignItems: "center",
  },
  pillDisabled: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    minWidth: 140,
    alignItems: "center",
    opacity: 0.9,
  },
  buttonRow: {
    marginTop: 18,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 120,
    alignItems: "center",
  },
  prevButton: {
    backgroundColor: "#d9c04c",
  },
  nextButton: {
    backgroundColor: "#4b4fbf",
    marginLeft: Spacing.two,
  },
  workersSection: {
    width: "100%",
    marginTop: 12,
  },
  workersSectionTitle: {
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  workersListWrapper: {
    width: '100%',
    maxHeight: 260,
    paddingHorizontal: 12,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderRadius: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#94a3b8',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
