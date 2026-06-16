import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

type Chemical = {
  id: number;
  name: string;
  quantity?: string;
  hazard_level: string;
  storage_location?: string;
  worksite_id?: number | null;
  worksite?: Worksite;
};

const initialFormState = {
  name: '',
  quantity: '',
  hazard_level: 'low',
  storage_location: '',
  worksite_id: null as number | null,
};

const normalizeChemical = (chemical: any): Chemical => ({
  id: Number(chemical.id ?? 0),
  name: String(chemical.name ?? ''),
  quantity: chemical.quantity ? String(chemical.quantity) : undefined,
  hazard_level: String(chemical.hazard_level ?? 'low'),
  storage_location: chemical.storage_location ? String(chemical.storage_location) : undefined,
  worksite_id: chemical.worksite_id ? Number(chemical.worksite_id) : null,
  worksite: chemical.worksite,
});

export default function ChemicalsPage() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();

  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null);
  const [formValues, setFormValues] = useState(initialFormState);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedViewItem, setSelectedViewItem] = useState<Chemical | null>(null);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [siteFilter, setSiteFilter] = useState<number | null>(null);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchChemicals = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/chemicals`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        const normalized = Array.isArray(data) ? data.map(normalizeChemical) : (data.data || []).map(normalizeChemical);
        setChemicals(normalized);
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

    fetchChemicals();
    fetchWorksites();
  }, [token]);

  const filteredChemicals = useMemo(() => {
    return chemicals.filter((chemical) => {
      const matchesSearch = chemical.name.toLowerCase().includes(search.toLowerCase());
      const matchesSite = siteFilter ? chemical.worksite_id === siteFilter : true;
      return matchesSearch && matchesSite;
    });
  }, [chemicals, search, siteFilter]);

  const openAddChemical = () => {
    setSelectedChemical(null);
    setIsEditing(false);
    setFormValues(initialFormState);
    setFormOpen(true);
  };

  const openEditChemical = (chemical: Chemical) => {
    setSelectedChemical(chemical);
    setIsEditing(true);
    setFormValues({
      name: chemical.name,
      quantity: chemical.quantity ?? '',
      hazard_level: chemical.hazard_level,
      storage_location: chemical.storage_location ?? '',
      worksite_id: chemical.worksite_id ?? null,
    });
    setFormOpen(true);
  };

  const handleSaveChemical = async () => {
    if (!token) return;
    if (!formValues.name.trim()) {
      Alert.alert('Validation error', 'Chemical name is required.');
      return;
    }

    const payload = {
      name: formValues.name,
      quantity: formValues.quantity || null,
      hazard_level: formValues.hazard_level,
      storage_location: formValues.storage_location || null,
      worksite_id: formValues.worksite_id,
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing && selectedChemical
      ? `${API_BASE_URL}/chemicals/${selectedChemical.id}`
      : `${API_BASE_URL}/chemicals`;

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

      const savedChemical = await response.json();
      if (!response.ok) {
        throw new Error(savedChemical.message || 'Unable to save chemical');
      }

      const normalizedSavedChemical = normalizeChemical(savedChemical);
      setFormOpen(false);
      setSelectedChemical(null);
      setIsEditing(false);
      setChemicals((prev) => {
        if (isEditing && selectedChemical) {
          return prev.map((chemical) => (chemical.id === selectedChemical.id ? normalizedSavedChemical : chemical));
        }
        return [normalizedSavedChemical, ...prev];
      });
      setSuccessMessage(isEditing ? 'Chemical Updated Successfully!' : 'Chemical Added Successfully!');
    } catch (error: any) {
      Alert.alert('Save failed', error.message || 'Unable to save chemical.');
    }
  };

  const handleDeleteChemical = async (chemicalId: number) => {
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/chemicals/${chemicalId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      Alert.alert('Delete failed', errorBody.message || 'Unable to delete chemical.');
      return;
    }

    setChemicals((prev) => prev.filter((chemical) => chemical.id !== chemicalId));
    setSuccessMessage('Chemical Deleted Successfully!');
  };

  const hazardOptions = ['low', 'medium', 'high'];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]} onPress={() => router.back()}>
            <ThemedText type="smallBold">←</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>
            Chemicals
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}> 
          <View style={[styles.topControls, { zIndex: 10 }]}>
            <Pressable style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]} onPress={openAddChemical}>
              <ThemedText type="smallBold">+ Add Chemicals</ThemedText>
            </Pressable>
            
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

            
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: '100%' }}>
              <View style={styles.tableHeader}>
            <Text style={[styles.columnHeader, { width: 60, minWidth: 60, flex: 0 }]}>ID</Text>
            <Text style={styles.columnHeader}>Name</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Site</Text>
            <Text style={[styles.columnHeader, { width: 100, minWidth: 100, flex: 0 }]}>Quantity</Text>
            <Text style={[styles.columnHeader, { width: 100, minWidth: 100, flex: 0 }]}>Hazard</Text>
            <Text style={[styles.columnHeader, { width: 150, minWidth: 150, flex: 0 }]}>Storage</Text>
            <Text style={styles.columnHeaderRight}>Actions</Text>
          </View>

          <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
            {filteredChemicals.map((chemical) => (
              <View key={chemical.id} style={styles.tableRow}>
                <Text style={[styles.rowCell, { width: 60, minWidth: 60, flex: 0 }]} numberOfLines={1}>{chemical.id}</Text>
                <Text style={styles.rowCell} numberOfLines={1}>{chemical.name}</Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>{chemical.worksite?.name ?? 'Unassigned'}</Text>
                <Text style={[styles.rowCell, { width: 100, minWidth: 100, flex: 0 }]} numberOfLines={1}>{chemical.quantity ?? 'N/A'}</Text>
                <Text style={[styles.rowCell, { width: 100, minWidth: 100, flex: 0 }]} numberOfLines={1}>{chemical.hazard_level}</Text>
                <Text style={[styles.rowCell, { width: 150, minWidth: 150, flex: 0 }]} numberOfLines={1}>{chemical.storage_location ?? 'N/A'}</Text>
                <View style={styles.actionsColumn}>
                  <Pressable style={styles.actionButtonIcon} onPress={() => { setSelectedViewItem(chemical); setViewDetailsOpen(true); }}>
                    <Text style={styles.actionIcon}>👁</Text>
                  </Pressable>
                  <Pressable style={styles.actionButtonIcon} onPress={() => openEditChemical(chemical)}>
                    <Text style={styles.actionIcon}>✎</Text>
                  </Pressable>
                  <Pressable style={styles.actionButtonIconDelete} onPress={() => handleDeleteChemical(chemical.id)}>
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
                <ThemedText type="title">{isEditing ? 'Update Chemical' : 'Add Chemical'}</ThemedText>
                <Pressable onPress={() => setFormOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Chemical Name"
                  value={formValues.name}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, name: value }))}
                />
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
                  placeholder="Quantity"
                  value={formValues.quantity}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, quantity: value }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Storage Location"
                  value={formValues.storage_location}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, storage_location: value }))}
                />
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Hazard Level</Text>
                  <View style={styles.statusList}>
                    {hazardOptions.map((hazard) => (
                      <Pressable
                        key={hazard}
                        style={[
                          styles.statusOption,
                          formValues.hazard_level === hazard && styles.statusOptionSelected,
                        ]}
                        onPress={() => setFormValues((prev) => ({ ...prev, hazard_level: hazard }))}
                      >
                        <Text
                          style={[
                            styles.statusOptionText,
                            formValues.hazard_level === hazard && styles.statusOptionTextSelected,
                          ]}
                        >
                          {hazard}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <Pressable style={styles.saveButton} onPress={handleSaveChemical}>
                  <Text style={styles.saveText}>Save Chemical</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        )}
        <Modal visible={viewDetailsOpen} transparent animationType="fade" onRequestClose={() => setViewDetailsOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title">Chemical Details</ThemedText>
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
                      <ThemedText type="smallBold" style={styles.detailLabel}>Quantity</ThemedText>
                      <ThemedText>{selectedViewItem.quantity ?? 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Hazard Level</ThemedText>
                      <ThemedText>{selectedViewItem.hazard_level}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Storage Location</ThemedText>
                      <ThemedText>{selectedViewItem.storage_location ?? 'N/A'}</ThemedText>
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
