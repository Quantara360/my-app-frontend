import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Camera } from "expo-camera";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  Text,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/services/authService";
import { useGoBack } from "@/hooks/use-go-back";
import { useColorScheme } from "react-native";

export default function MarkAttendance() {
  const router = useRouter();
  const goBack = useGoBack();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { worksiteId, subSiteId, shift: paramShift, state: paramState } = useLocalSearchParams<{ worksiteId?: string; subSiteId?: string; shift?: string; state?: string }>();
  console.log('[mark-attendance] params:', { worksiteId, subSiteId, paramShift, paramState });
  const { token } = useAuth();
  const [shift, setShift] = useState(paramShift || "Evening");
  const [state, setState] = useState(paramState || "IN");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <ThemedText type="title" style={styles.title}>
            Mark Attendance
          </ThemedText>
        </View>

        <View style={styles.cardWrap}>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}> 
            <ThemedText type="subtitle" style={[styles.cardTitle, { backgroundColor: theme.background }]}> 
              Enter Details
            </ThemedText>

            <View style={styles.formRow}>
              <ThemedText type="small">Shift:</ThemedText>
              <Pressable
                style={[styles.pill, { backgroundColor: theme.background }]}
                onPress={() =>
                  setShift((s) => (s === "Evening" ? "Morning" : "Evening"))
                }
              >
                <ThemedText type="small">{shift === "Morning" ? "Day Shift" : "Night Shift"}</ThemedText>
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
                style={[styles.pill, { backgroundColor: theme.background }]}
                onPress={() =>
                  setState((s) => (s === "IN" ? "OUT" : "IN"))
                }
              >
                <ThemedText type="small">{state}</ThemedText>
              </Pressable>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
              />
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
                        subSiteId: String(subSiteId || ""),
                        shift,
                        state,
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
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  width: '100%',
  alignSelf: 'center',
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    textAlign: "center",
  },
  cardWrap: {
    width: "100%",
    alignItems: "center",
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
    maxHeight: 180,
    width: '100%',
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
