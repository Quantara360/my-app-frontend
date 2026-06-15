import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SuccessModal } from '@/components/success-modal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE_URL } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

type Worksite = {
  id: number;
  name: string;
};

type Machinery = {
  id: number;
  name: string;
  status: string;
  location?: string;
  maintenance_due_at?: string;
  worksite_id?: number | null;
  worksite?: Worksite;
};

const initialFormState = {
  name: '',
  status: 'operational',
  location: '',
  maintenance_due_at: '',
  worksite_id: null as number | null,
};

const normalizeMachinery = (machinery: any): Machinery => ({
  id: Number(machinery.id ?? 0),
  name: String(machinery.name ?? ''),
  status: String(machinery.status ?? 'operational'),
  location: machinery.location ? String(machinery.location) : undefined,
  maintenance_due_at: machinery.maintenance_due_at ? String(machinery.maintenance_due_at) : undefined,
  worksite_id: machinery.worksite_id ? Number(machinery.worksite_id) : null,
  worksite: machinery.worksite,
});

export default function MachineriesPage() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();

  const [machineries, setMachineries] = useState<Machinery[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMachinery, setSelectedMachinery] = useState<Machinery | null>(null);
  const [formValues, setFormValues] = useState(initialFormState);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [maintenanceDate, setMaintenanceDate] = useState<Date>(new Date());
  const [showMaintenancePicker, setShowMaintenancePicker] = useState(false);
  const webDateInputRef = React.useRef<HTMLInputElement | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedViewItem, setSelectedViewItem] = useState<Machinery | null>(null);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [siteFilter, setSiteFilter] = useState<number | null>(null);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchMachineries = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/machineries`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        const normalized = Array.isArray(data) ? data.map(normalizeMachinery) : (data.data || []).map(normalizeMachinery);
        setMachineries(normalized);
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

    fetchMachineries();
    fetchWorksites();
  }, [token]);

  const filteredMachineries = useMemo(() => {
    return machineries.filter((machinery) => {
      const matchesSearch = machinery.name.toLowerCase().includes(search.toLowerCase());
      const matchesSite = siteFilter ? machinery.worksite_id === siteFilter : true;
      return matchesSearch && matchesSite;
    });
  }, [machineries, search, siteFilter]);

  const handleGoBack = () => {
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace('/dashboard');
    }
  };

  const openAddMachinery = () => {
    setSelectedMachinery(null);
    setIsEditing(false);
    setFormValues(initialFormState);
    setMaintenanceDate(new Date());
    setShowMaintenancePicker(false);
    setFormOpen(true);
  };

  const openEditMachinery = (machinery: Machinery) => {
    setSelectedMachinery(machinery);
    setIsEditing(true);
    setFormValues({
      name: machinery.name,
      status: machinery.status,
      location: machinery.location ?? '',
      maintenance_due_at: machinery.maintenance_due_at ?? '',
      worksite_id: machinery.worksite_id ?? null,
    });
    const parsedDate = machinery.maintenance_due_at ? new Date(machinery.maintenance_due_at) : new Date();
    setMaintenanceDate(parsedDate);
    setShowMaintenancePicker(false);
    setFormOpen(true);
  };

  const handleSaveMachinery = async () => {
    if (!token) {
      return;
    }

    if (!formValues.name.trim()) {
      Alert.alert('Validation error', 'Machine name is required.');
      return;
    }

    const payload = {
      name: formValues.name,
      status: formValues.status,
      location: formValues.location || null,
      maintenance_due_at: formValues.maintenance_due_at || maintenanceDate.toISOString().split('T')[0],
      worksite_id: formValues.worksite_id,
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing && selectedMachinery
      ? `${API_BASE_URL}/machineries/${selectedMachinery.id}`
      : `${API_BASE_URL}/machineries`;

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

      const savedMachinery = await response.json();
      if (!response.ok) {
        throw new Error(savedMachinery.message || 'Unable to save machinery');
      }

      const normalizedSavedMachinery = normalizeMachinery(savedMachinery);
      setFormOpen(false);
      setSelectedMachinery(null);
      setIsEditing(false);
      setMachineries((prev) => {
        if (isEditing && selectedMachinery) {
          return prev.map((machinery) => (
            machinery.id === selectedMachinery.id ? normalizedSavedMachinery : machinery
          ));
        }
        return [normalizedSavedMachinery, ...prev];
      });
      setSuccessMessage(isEditing ? 'Machine Updated Successfully!' : 'Machine Added Successfully!');
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Unable to save machinery.');
    }
  };

  const handleDeleteMachinery = async (machineryId: number) => {
    if (!token) {
      return;
    }

    const res = await fetch(`${API_BASE_URL}/machineries/${machineryId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      Alert.alert('Delete failed', errorBody.message || 'Unable to delete machinery.');
      return;
    }

    setMachineries((prev) => prev.filter((machinery) => machinery.id !== machineryId));
    setSuccessMessage('Machine Deleted Successfully!');
  };

  const statusOptions = ['operational', 'maintenance', 'broken'];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]} onPress={handleGoBack}>
            <ThemedText type="smallBold">←</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>
            Machineries
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}> 
          <View style={styles.topControls}>
            <Pressable style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]} onPress={openAddMachinery}>
              <ThemedText type="smallBold">+ Add Machine</ThemedText>
            </Pressable>
            
            <View style={{ position: 'relative', zIndex: 10, flex: 1, minWidth: 140 }}>
              <Pressable style={[styles.searchInput, { flex: 0, minHeight: 44, justifyContent: 'center' }]} onPress={() => setFilterPickerOpen((prev) => !prev)}>
                <Text style={{ color: theme.text }}>
                  {siteFilter ? worksites.find((site) => site.id === siteFilter)?.name : 'Site Selection'}
                </Text>
              </Pressable>
              {filterPickerOpen && (
                <View style={[styles.statusOptions, { position: 'absolute', top: 40, left: 0, right: 0, zIndex: 20 }]}> 
                  <Pressable style={styles.statusOption} onPress={() => { setSiteFilter(null); setFilterPickerOpen(false); }}>
                    <Text style={styles.statusOptionText}>All Sites</Text>
                  </Pressable>
                  {worksites.map((site) => (
                    <Pressable key={site.id} style={styles.statusOption} onPress={() => { setSiteFilter(site.id); setFilterPickerOpen(false); }}>
                      <Text style={styles.statusOptionText}>{site.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <TextInput
              style={[styles.searchInput, { flex: 1, minWidth: 160 }]}
              placeholder="Search"
              placeholderTextColor={theme.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: '100%' }}>
              <View style={styles.tableHeader}>
            <Text style={[styles.columnHeader, { width: 60, minWidth: 60, flex: 0 }]}>ID</Text>
            <Text style={[styles.columnHeader, { width: 150, minWidth: 150, flex: 0 }]}>Machine</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Site</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Status</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Due</Text>
            <Text style={styles.columnHeaderRight}>Actions</Text>
          </View>

          <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
            {filteredMachineries.map((machinery) => (
              <View key={machinery.id} style={styles.tableRow}>
                <Text style={[styles.rowCell, { width: 60, minWidth: 60, flex: 0 }]} numberOfLines={1}>{machinery.id}</Text>
                <Text style={[styles.rowCell, { width: 150, minWidth: 150, flex: 0 }]} numberOfLines={1}>{machinery.name}</Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>{machinery.worksite?.name ?? 'Unassigned'}</Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>{machinery.status}</Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>{machinery.maintenance_due_at ?? 'N/A'}</Text>
                <View style={styles.actionsColumn}>
                  <Pressable style={styles.actionButtonIcon} onPress={() => { setSelectedViewItem(machinery); setViewDetailsOpen(true); }}>
                    <Text style={styles.actionIcon}>👁</Text>
                  </Pressable>
                  <Pressable style={styles.actionButtonIcon} onPress={() => openEditMachinery(machinery)}>
                    <Text style={styles.actionIcon}>✎</Text>
                  </Pressable>
                  <Pressable style={styles.actionButtonIconDelete} onPress={() => handleDeleteMachinery(machinery.id)}>
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
                <ThemedText type="title">{isEditing ? 'Update Machine' : 'Add Machine'}</ThemedText>
                <Pressable onPress={() => setFormOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Machine Name"
                  value={formValues.name}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, name: value }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Location"
                  value={formValues.location}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, location: value }))}
                />
                <View style={[styles.fieldRow, { zIndex: sitePickerOpen ? 100 : 1 }]}>
                  <Text style={styles.fieldLabel}>Site Selection</Text>
                  <Pressable style={styles.selectInput} onPress={() => setSitePickerOpen((prev) => !prev)}>
                    <Text style={styles.selectText}>
                      {formValues.worksite_id
                        ? worksites.find((site) => site.id === formValues.worksite_id)?.name
                        : 'Site Selection'}
                    </Text>
                  </Pressable>
                  {sitePickerOpen && (
                    <View style={[styles.statusOptions, { position: 'absolute', top: 75, left: 0, right: 0, zIndex: 100 }]}>
                      {worksites.map((site) => (
                        <Pressable
                          key={site.id}
                          style={styles.statusOption}
                          onPress={() => {
                            setFormValues((prev) => ({ ...prev, worksite_id: site.id }));
                            setSitePickerOpen(false);
                          }}
                        >
                          <Text style={styles.statusOptionText}>{site.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
                {Platform.OS === 'web' ? (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Maintenance Due</Text>
                    <Pressable
                      style={[styles.pill, { backgroundColor: theme.background }]}
                      onPress={() => {
                        webDateInputRef.current?.showPicker?.();
                        webDateInputRef.current?.click();
                      }}
                    >
                      <Text style={styles.pillText}>
                        {formValues.maintenance_due_at || maintenanceDate.toISOString().split('T')[0]}
                      </Text>
                    </Pressable>
                    <input
                      ref={webDateInputRef}
                      type="date"
                      value={formValues.maintenance_due_at || maintenanceDate.toISOString().split('T')[0]}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setFormValues((prev) => ({ ...prev, maintenance_due_at: value }));
                        const parsedDate = new Date(value);
                        if (!Number.isNaN(parsedDate.getTime())) {
                          setMaintenanceDate(parsedDate);
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
                      <Text style={styles.fieldLabel}>Maintenance Due</Text>
                      <Pressable
                        style={[styles.pill, { backgroundColor: theme.background }]}
                        onPress={() => setShowMaintenancePicker(true)}
                      >
                        <Text style={styles.pillText}>
                          {maintenanceDate.toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </Pressable>
                    </View>
                    {showMaintenancePicker && (
                      <DateTimePicker
                        value={maintenanceDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_event, selectedDate) => {
                          setShowMaintenancePicker(Platform.OS === 'ios');
                          if (selectedDate) {
                            setMaintenanceDate(selectedDate);
                            setFormValues((prev) => ({
                              ...prev,
                              maintenance_due_at: selectedDate.toISOString().split('T')[0],
                            }));
                          }
                        }}
                      />
                    )}
                  </>
                )}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.statusList}>
                    {statusOptions.map((status) => (
                      <Pressable
                        key={status}
                        style={[
                          styles.statusOption,
                          formValues.status === status && styles.statusOptionSelected,
                        ]}
                        onPress={() => setFormValues((prev) => ({ ...prev, status }))}
                      >
                        <Text
                          style={[
                            styles.statusOptionText,
                            formValues.status === status && styles.statusOptionTextSelected,
                          ]}
                        >
                          {status}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <Pressable style={styles.saveButton} onPress={handleSaveMachinery}>
                  <Text style={styles.saveText}>Save Machine</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        )}
        <Modal visible={viewDetailsOpen} transparent animationType="fade" onRequestClose={() => setViewDetailsOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title">Machinery Details</ThemedText>
                <Pressable onPress={() => setViewDetailsOpen(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody}>
                {selectedViewItem && (
                  <>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Name</ThemedText>
                      <ThemedText>{selectedViewItem.name}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Worksite</ThemedText>
                      <ThemedText>{selectedViewItem.worksite?.name ?? 'Unassigned'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Status</ThemedText>
                      <ThemedText>{selectedViewItem.status}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Location</ThemedText>
                      <ThemedText>{selectedViewItem.location ?? 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Maintenance Due</ThemedText>
                      <ThemedText>{selectedViewItem.maintenance_due_at ?? 'N/A'}</ThemedText>
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

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
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
    minWidth: 140,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonIconDelete: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.backgroundSelected,
  },
  pillText: {
    color: theme.text,
    fontSize: 13,
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
  statusOptions: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: Spacing.one,
    backgroundColor: theme.backgroundSelected,
  },
  statusList: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  statusOption: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    backgroundColor: theme.backgroundSelected,
  },
  statusOptionSelected: {
    backgroundColor: '#0f172a',
  },
  statusOptionText: {
    color: theme.text,
    fontSize: 13,
  },
  statusOptionTextSelected: {
    color: '#fff',
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
