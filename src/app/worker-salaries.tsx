import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SuccessModal } from '@/components/success-modal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE_URL } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { useGoBack } from "@/hooks/use-go-back";

type Worksite = {
  id: number;
  name: string;
};

type Worker = {
  id: number;
  name: string;
};

type WorkerSalary = {
  id: number;
  worker_id: number;
  worker?: Worker;
  salary: number;
  type: string;
  date?: string;
  worksite_id?: number | null;
  worksite?: Worksite;
};

const initialFormState = {
  worker_id: null as number | null,
  salary: '',
  type: 'monthly',
  date: '',
  worksite_id: null as number | null,
};

const normalizeSalary = (salary: any): WorkerSalary => ({
  id: Number(salary.id ?? 0),
  worker_id: Number(salary.worker_id ?? 0),
  worker: salary.worker ? { id: Number(salary.worker.id), name: String(salary.worker.name) } : undefined,
  salary: Number(salary.salary ?? 0),
  type: String(salary.type ?? 'monthly'),
  date: salary.date ? String(salary.date) : undefined,
  worksite_id: salary.worksite_id ? Number(salary.worksite_id) : null,
  worksite: salary.worksite,
});

export default function WorkerSalariesPage() {
  const goBack = useGoBack();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();

  const [salaries, setSalaries] = useState<WorkerSalary[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<WorkerSalary | null>(null);
  const [salaryDate, setSalaryDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formValues, setFormValues] = useState(initialFormState);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [workerPickerOpen, setWorkerPickerOpen] = useState(false);
  const webDateInputRef = useRef<HTMLInputElement | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedViewItem, setSelectedViewItem] = useState<WorkerSalary | null>(null);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [siteFilter, setSiteFilter] = useState<number | null>(null);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const authHeader = { Authorization: `Bearer ${token}` };

        const workersResponse = await fetch(`${API_BASE_URL}/workers`, {
          headers: { Accept: 'application/json', ...authHeader },
        });
        const workersData = await workersResponse.json();
        setWorkers(Array.isArray(workersData) ? workersData : workersData.data || []);

        const salariesResponse = await fetch(`${API_BASE_URL}/worker-salaries`, {
          headers: { Accept: 'application/json', ...authHeader },
        });
        const salariesData = await salariesResponse.json();
        const normalized = Array.isArray(salariesData) ? salariesData.map(normalizeSalary) : [];
        setSalaries(normalized);
      } catch (error) {
        console.error(error);
      }
    };

    const fetchWorksites = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/worksites`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setWorksites(Array.isArray(data) ? data : data.data || []);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
    fetchWorksites();
  }, [token]);

  const filteredSalaries = useMemo(() => {
    return salaries.filter((salary) => {
      const matchesSearch = salary.worker?.name.toLowerCase().includes(search.toLowerCase()) || false;
      const matchesSite = siteFilter ? salary.worksite_id === siteFilter : true;
      return matchesSearch && matchesSite;
    });
  }, [salaries, search, siteFilter]);

  const openAddSalary = () => {
    setSelectedSalary(null);
    setIsEditing(false);
    setFormValues(initialFormState);
    setSalaryDate(new Date());
    setShowDatePicker(false);
    setWorkerPickerOpen(false);
    setFormOpen(true);
  };

  const openEditSalary = (salary: WorkerSalary) => {
    setSelectedSalary(salary);
    setIsEditing(true);
    const parsedDate = salary.date ? new Date(salary.date) : new Date();
    setFormValues({
      worker_id: salary.worker_id,
      salary: String(salary.salary ?? 0),
      type: salary.type,
      date: salary.date ?? '',
      worksite_id: salary.worksite_id ?? null,
    });
    setSalaryDate(parsedDate);
    setShowDatePicker(false);
    setWorkerPickerOpen(false);
    setFormOpen(true);
  };

  const handleSaveSalary = async () => {
    if (!token) return;

    if (!formValues.worker_id) {
      Alert.alert('Validation error', 'Please select a worker.');
      return;
    }

    if (!formValues.salary.trim()) {
      Alert.alert('Validation error', 'Salary amount is required.');
      return;
    }

    const payload = {
      worker_id: formValues.worker_id,
      salary: Number(formValues.salary),
      type: formValues.type,
      date: formValues.date || salaryDate.toISOString().split('T')[0],
      worksite_id: formValues.worksite_id,
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing && selectedSalary ? `${API_BASE_URL}/worker-salaries/${selectedSalary.id}` : `${API_BASE_URL}/worker-salaries`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const savedSalary = await response.json();
      if (!response.ok) {
        throw new Error(savedSalary.message || 'Unable to save salary record');
      }

      const normalizedSalary = normalizeSalary(savedSalary);
      setFormOpen(false);
      setSalaries((prev) => {
        if (isEditing && selectedSalary) {
          return prev.map((s) => (s.id === selectedSalary.id ? normalizedSalary : s));
        }
        return [normalizedSalary, ...prev];
      });
      setSuccessMessage(isEditing ? 'Salary Updated Successfully!' : 'Salary Added Successfully!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to save salary record');
    }
  };

  const handleDeleteSalary = async (salaryId: number) => {
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/worker-salaries/${salaryId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      Alert.alert('Delete failed', errorBody.message || 'Unable to delete salary record.');
      return;
    }

    setSalaries((prev) => prev.filter((s) => s.id !== salaryId));
    setSuccessMessage('Salary Deleted Successfully!');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]} onPress={() => goBack()}>
            <ThemedText type="smallBold">←</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>
            Worker Salaries
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.topControls, { zIndex: 10 }]}>
            <View style={{ position: 'relative', zIndex: 10, flex: 1, minWidth: 140 }}>
              <Pressable style={[styles.searchInput, { flex: 0, minHeight: 44, justifyContent: 'center' }]} onPress={() => setFilterPickerOpen((prev) => !prev)}>
                <Text style={{ color: theme.text }} numberOfLines={1}>
                  {siteFilter ? worksites.find((site) => site.id === siteFilter)?.name : 'Site Selection'}
                </Text>
              </Pressable>
              {filterPickerOpen && (
                <View style={[styles.statusOptions, { position: 'absolute', top: 40, left: 0, right: 0, zIndex: 20 }]}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}> 
                  <Pressable style={styles.statusOption} onPress={() => { setSiteFilter(null); setFilterPickerOpen(false); }}>
                    <Text style={styles.statusOptionText} numberOfLines={1}>All Sites</Text>
                  </Pressable>
                  {worksites.map((site) => (
                    <Pressable key={site.id} style={styles.statusOption} onPress={() => { setSiteFilter(site.id); setFilterPickerOpen(false); }}>
                      <Text style={styles.statusOptionText} numberOfLines={1}>{site.name}</Text>
                    </Pressable>
                  ))}
                
                    </ScrollView>
                  </View>
              )}
            </View>
            
            <Pressable style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]} onPress={openAddSalary}>
              <ThemedText type="smallBold">+ Add</ThemedText>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: '100%' }}>
              <View style={styles.tableHeader}>
            <Text style={[styles.columnHeader, { width: 60, minWidth: 60, flex: 0 }]}>ID</Text>
            <Text style={[styles.columnHeader, { width: 150, minWidth: 150, flex: 0 }]}>Worker</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Site</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Salary</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Type</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Date</Text>
            <Text style={styles.columnHeaderRight}>Actions</Text>
          </View>

          <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
            {filteredSalaries.map((salary) => (
              <View key={salary.id} style={styles.tableRow}>
                <Text style={[styles.rowCell, { width: 60, minWidth: 60, flex: 0 }]} numberOfLines={1}>
                  {salary.id}
                </Text>
                <Text style={[styles.rowCell, { width: 150, minWidth: 150, flex: 0 }]} numberOfLines={1}>
                  {salary.worker?.name ?? 'Unknown'}
                </Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>
                  {salary.worksite?.name ?? 'Unassigned'}
                </Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>
                  {salary.salary}
                </Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>
                  {salary.type}
                </Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>
                  {salary.date}
                </Text>
                <View style={styles.actionsColumn}>
                  <Pressable style={styles.actionButtonIcon} onPress={() => { setSelectedViewItem(salary); setViewDetailsOpen(true); }}>
                    <Text style={styles.actionIcon}>👁</Text>
                  </Pressable>
                  <Pressable style={styles.actionButtonIcon} onPress={() => openEditSalary(salary)}>
                    <Text style={styles.actionIcon}>✎</Text>
                  </Pressable>
                  <Pressable style={styles.actionButtonIconDelete} onPress={() => handleDeleteSalary(salary.id)}>
                    <Text style={styles.actionIcon}>🗑</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
            </View>
          </ScrollView>
        </View>

        {formOpen && (
          <View style={styles.formOverlay}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <ThemedText type="title">{isEditing ? 'Update Salary' : 'Add Salary'}</ThemedText>
                <Pressable onPress={() => setFormOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
                <View style={[styles.fieldRow, { zIndex: workerPickerOpen ? 100 : 1 }]}>
                  <Text style={styles.fieldLabel}>Select Worker</Text>
                  <Pressable style={styles.selectInput} onPress={() => setWorkerPickerOpen((prev) => !prev)}>
                    <Text style={styles.selectText} numberOfLines={1}>
                      {formValues.worker_id ? workers.find((w) => w.id === formValues.worker_id)?.name : 'Select Worker'}
                    </Text>
                  </Pressable>
                  {workerPickerOpen && (
                    <View style={styles.workerOptions}>
                      {workers.map((worker) => (
                        <Pressable
                          key={worker.id}
                          style={styles.workerOption}
                          onPress={() => {
                            setFormValues((prev) => ({
                              ...prev,
                              worker_id: worker.id,
                            }));
                            setWorkerPickerOpen(false);
                          }}
                        >
                          <Text style={styles.workerOptionText}>{worker.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                <View style={[styles.fieldRow, { zIndex: sitePickerOpen ? 100 : 1 }]}>
                  <Text style={styles.fieldLabel}>Site Selection</Text>
                  <Pressable style={styles.selectInput} onPress={() => setSitePickerOpen((prev) => !prev)}>
                    <Text style={styles.selectText} numberOfLines={1}>
                      {formValues.worksite_id
                        ? worksites.find((site) => site.id === formValues.worksite_id)?.name
                        : 'Site Selection'}
                    </Text>
                  </Pressable>
                  {sitePickerOpen && (
                    <View style={[styles.statusOptions, { position: 'absolute', top: 75, left: 0, right: 0, zIndex: 100 }]}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                      {worksites.map((site) => (
                        <Pressable
                          key={site.id}
                          style={styles.statusOption}
                          onPress={() => {
                            setFormValues((prev) => ({ ...prev, worksite_id: site.id }));
                            setSitePickerOpen(false);
                          }}
                        >
                          <Text style={styles.statusOptionText} numberOfLines={1}>{site.name}</Text>
                        </Pressable>
                      ))}
                    
                    </ScrollView>
                  </View>
                  )}
                </View>

                <TextInput
                  style={styles.textInput}
                  placeholder="Salary Amount"
                  keyboardType="decimal-pad"
                  value={formValues.salary}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, salary: value }))}
                />

                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Type</Text>
                  <View style={styles.typeList}>
                    {['monthly', 'annual', 'hourly'].map((typeOption) => (
                      <Pressable
                        key={typeOption}
                        style={[
                          styles.typeOption,
                          formValues.type === typeOption && styles.typeOptionSelected,
                        ]}
                        onPress={() => setFormValues((prev) => ({ ...prev, type: typeOption }))}
                      >
                        <Text
                          style={[
                            styles.typeOptionText,
                            formValues.type === typeOption && styles.typeOptionTextSelected,
                          ]}
                        >
                          {typeOption}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {Platform.OS === 'web' ? (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Date</Text>
                    <Pressable
                      style={[styles.pill, { backgroundColor: theme.background }]}
                      onPress={() => {
                        webDateInputRef.current?.showPicker?.();
                        webDateInputRef.current?.click();
                      }}
                    >
                      <Text style={styles.pillText}>
                        {formValues.date || salaryDate.toISOString().split('T')[0]}
                      </Text>
                    </Pressable>
                    <input
                      ref={webDateInputRef}
                      type="date"
                      value={formValues.date || salaryDate.toISOString().split('T')[0]}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setFormValues((prev) => ({ ...prev, date: value }));
                        const parsedDate = new Date(value);
                        if (!Number.isNaN(parsedDate.getTime())) {
                          setSalaryDate(parsedDate);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: 1,
                        height: 1,
                        zIndex: -1,
                        pointerEvents: 'none',
                      }}
                    />
                  </View>
                ) : (
                  <>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Date</Text>
                      <Pressable
                        style={[styles.pill, { backgroundColor: theme.background }]}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Text style={styles.pillText}>
                          {salaryDate.toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </Pressable>
                    </View>
                    {showDatePicker && (
                      <DateTimePicker
                        value={salaryDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_event, selectedDate) => {
                          setShowDatePicker(Platform.OS === 'ios');
                          if (selectedDate) {
                            setSalaryDate(selectedDate);
                            setFormValues((prev) => ({
                              ...prev,
                              date: selectedDate.toISOString().split('T')[0],
                            }));
                          }
                        }}
                      />
                    )}
                  </>
                )}

                <Pressable style={styles.saveButton} onPress={handleSaveSalary}>
                  <Text style={styles.saveText}>Save Salary</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        )}
        <Modal visible={viewDetailsOpen} transparent animationType="fade" onRequestClose={() => setViewDetailsOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title">Worker Salary Details</ThemedText>
                <Pressable onPress={() => setViewDetailsOpen(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody}>
                {selectedViewItem && (
                  <>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Worker Name</ThemedText>
                      <ThemedText>{selectedViewItem.worker?.name ?? 'Unknown'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Worksite</ThemedText>
                      <ThemedText>{selectedViewItem.worksite?.name ?? 'Unassigned'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Salary Amount</ThemedText>
                      <ThemedText>{selectedViewItem.salary}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Type</ThemedText>
                      <ThemedText>{selectedViewItem.type}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Date</ThemedText>
                      <ThemedText>{selectedViewItem.date ?? 'N/A'}</ThemedText>
                    </View>
                  </>
                )}
              </ScrollView>
              <View style={styles.modalFooter}>
                <Pressable style={[styles.modalButton, { backgroundColor: '#3b82f6' }]} onPress={() => setViewDetailsOpen(false)}>
                  <Text style={styles.modalButtonText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <SuccessModal
          visible={!!successMessage}
          title={successMessage ?? ''}
          onClose={() => setSuccessMessage(null)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.four,
      paddingBottom: BottomTabInset,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
      gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      marginTop: 40,
    },
    backButton: {
      padding: Spacing.two,
      borderRadius: 14,
    },
    pageTitle: {
      flex: 1,
      textAlign: 'center',
      color: theme.text,
    },
    card: {
      borderRadius: 30,
      padding: Spacing.four,
      gap: Spacing.three,
      minHeight: 520,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
      backgroundColor: theme.backgroundElement,
    },
    topControls: {
      flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    flexWrap: 'wrap',
    },
    addButton: {
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.four,
      borderRadius: 24,
      minWidth: 80,
    },
    searchInput: {
      flex: 1,
      minWidth: 160,
      padding: Spacing.two,
      borderRadius: 24,
      backgroundColor: theme.background,
      color: theme.text,
      fontSize: 13,
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingVertical: Spacing.three,
      paddingHorizontal: Spacing.two,
      borderBottomWidth: 2,
      borderColor: theme.backgroundSelected,
      backgroundColor: theme.background,
      gap: Spacing.two,
    },
    columnHeader: {
      flex: 1,
      minWidth: 120,
      fontWeight: '700',
      color: theme.text,
      fontSize: 13,
    },
    columnHeaderRight: {
    minWidth: 120,
    textAlign: 'center',
    fontWeight: '700',
    color: theme.text,
    fontSize: 13,
  },
    tableBody: {
      marginTop: Spacing.two,
      maxHeight: 340,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.two,
      borderBottomWidth: 1,
      borderColor: theme.backgroundSelected,
      gap: Spacing.one,
    },
    rowCell: {
      flex: 1,
      minWidth: 120,
      color: theme.text,
      fontSize: 13,
    },
      
    
    actionsColumn: {
    minWidth: 120,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
    actionButtonIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#10b981',
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButtonIconDelete: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#ef4444',
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionIcon: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 12,
    },
    formOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.35)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.four,
    },
    formCard: {
      width: '100%',
      maxHeight: '85%',
      borderRadius: 28,
      backgroundColor: theme.backgroundElement,
      padding: Spacing.four,
      gap: Spacing.three,
    },
    formHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    closeText: {
      fontSize: 20,
      color: theme.text,
    },
    formBody: {
      gap: Spacing.two,
    },
    fieldRow: {
      gap: Spacing.one,
    },
    fieldLabel: {
      fontSize: 13,
      color: theme.text,
      fontWeight: '700',
      marginBottom: Spacing.one,
    },
    selectInput: {
      width: '100%',
      padding: Spacing.two,
      borderRadius: 24,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
    },
    selectText: {
      color: theme.text,
      fontSize: 13,
    },
    textInput: {
      width: '100%',
      padding: Spacing.two,
      borderRadius: 24,
      backgroundColor: theme.background,
      color: theme.text,
      fontSize: 13,
      marginTop: Spacing.one,
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
    },
    pill: {
      borderRadius: 24,
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.four,
      minWidth: 140,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
    },
    pillText: {
      color: theme.text,
      fontSize: 13,
    },
    typeList: {
      flexDirection: 'row',
      gap: Spacing.two,
      flexWrap: 'wrap',
    },
    typeOption: {
      paddingVertical: Spacing.one,
      paddingHorizontal: Spacing.three,
      borderRadius: 20,
      backgroundColor: theme.backgroundSelected,
    },
    typeOptionSelected: {
      backgroundColor: '#0f172a',
    },
    typeOptionText: {
      color: theme.text,
      fontSize: 13,
    },
    typeOptionTextSelected: {
      color: '#fff',
    },
    statusOptions: {
      borderRadius: 20,
      overflow: 'hidden',
      marginTop: Spacing.one,
      backgroundColor: theme.backgroundSelected,
    },
    statusOption: {
      paddingVertical: Spacing.one,
      paddingHorizontal: Spacing.three,
      borderRadius: 20,
      backgroundColor: theme.backgroundSelected,
    },
    statusOptionText: {
      color: theme.text,
      fontSize: 13,
    },
    workerOptions: {
      marginTop: Spacing.two,
      borderRadius: 20,
      backgroundColor: theme.backgroundSelected,
      overflow: 'hidden',
    },
    workerOption: {
      padding: Spacing.three,
      borderBottomWidth: 1,
      borderColor: theme.background,
    },
    workerOptionText: {
      color: theme.text,
    },
    saveButton: {
      marginTop: Spacing.three,
      padding: Spacing.three,
      borderRadius: 24,
      backgroundColor: '#0f172a',
      alignItems: 'center',
    },
    saveText: {
      color: '#fff',
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      borderRadius: 16,
      width: '90%',
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.three,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    modalCloseButton: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    modalBody: {
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.three,
    },
    detailRow: {
      marginBottom: Spacing.three,
      paddingBottom: Spacing.two,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    detailLabel: {
      marginBottom: Spacing.one,
    },
    modalFooter: {
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.three,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0, 0, 0, 0.1)',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.two,
    },
    modalButton: {
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.two,
      borderRadius: 8,
    },
    modalButtonText: {
      color: 'white',
      fontWeight: '600',
    },
  });
