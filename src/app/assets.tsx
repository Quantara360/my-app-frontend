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
import { useGoBack } from "@/hooks/use-go-back";

type Worksite = {
  id: number;
  name: string;
};

type Asset = {
  id: number;
  name: string;
  type?: string;
  location?: string;
  status: string;
  count: number;
  value: number;
  worksite_id?: number | null;
  worksite?: Worksite;
};

const normalizeAsset = (asset: any): Asset => ({
  id: Number(asset.id ?? 0),
  name: String(asset.name ?? ''),
  type: asset.type ? String(asset.type) : undefined,
  location: asset.location ? String(asset.location) : undefined,
  status: String(asset.status ?? 'available'),
  count: Number(asset.count ?? 0),
  value: Number(asset.value ?? 0),
  worksite_id: asset.worksite_id ? Number(asset.worksite_id) : null,
  worksite: asset.worksite,
});

const initialFormState = {
  name: '',
  type: '',
  location: '',
  count: '',
  value: '',
  status: 'available',
  worksite_id: null as number | null,
};

export default function AssetsPage() {
  const goBack = useGoBack();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [formValues, setFormValues] = useState(initialFormState);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedViewAsset, setSelectedViewAsset] = useState<Asset | null>(null);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [siteFilter, setSiteFilter] = useState<number | null>(null);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchAssets = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/assets`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        const normalized = Array.isArray(data) ? data.map(normalizeAsset) : (data.data || []).map(normalizeAsset);
        setAssets(normalized);
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

    fetchAssets();
    fetchWorksites();
  }, [token]);

  const filteredAssets = useMemo(() => {
    return (assets ?? []).filter((asset) => {
      const matchesSearch = (asset.name ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesSite = siteFilter ? asset.worksite_id === siteFilter : true;
      return matchesSearch && matchesSite;
    });
  }, [assets, search, siteFilter]);

  const openAddAsset = () => {
    setSelectedAsset(null);
    setIsEditing(false);
    setFormValues(initialFormState);
    setFormOpen(true);
  };

  const openEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsEditing(true);
    setFormValues({
      name: asset.name,
      type: asset.type ?? '',
      location: asset.location ?? '',
      status: asset.status,
      count: String(asset.count ?? 0),
      value: String(asset.value ?? 0),
      worksite_id: asset.worksite_id ?? null,
    });
    setFormOpen(true);
  };

  const handleSaveAsset = async () => {
    if (!token) {
      return;
    }

    if (!formValues.name.trim()) {
      Alert.alert('Validation error', 'Asset name is required.');
      return;
    }

    const payload = {
      name: formValues.name,
      type: formValues.type || null,
      location: formValues.location || null,
      status: formValues.status,
      count: Number(formValues.count) || 0,
      value: Number(formValues.value) || 0,
      worksite_id: formValues.worksite_id,
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing && selectedAsset
      ? `${API_BASE_URL}/assets/${selectedAsset.id}`
      : `${API_BASE_URL}/assets`;

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

      const savedAsset = await response.json();
      const normalizedSavedAsset = normalizeAsset(savedAsset);

      if (!response.ok) {
        throw new Error(savedAsset.message || 'Unable to save asset');
      }

      setFormOpen(false);
      setSelectedAsset(null);
      setIsEditing(false);
      setAssets((prev) => {
        if (isEditing && selectedAsset) {
          return prev.map((asset) => (asset.id === selectedAsset.id ? normalizedSavedAsset : asset));
        }
        return [normalizedSavedAsset, ...prev];
      });
      setSuccessMessage(isEditing ? 'Asset Updated Successfully!' : 'Asset Added Successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to save asset.';
      Alert.alert('Save failed', errorMessage);
    }
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (!token) {
      return;
    }

    const res = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      Alert.alert('Delete failed', errorBody.message || 'Unable to delete asset.');
      return;
    }

    setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
    setSuccessMessage('Asset Deleted Successfully!');
  };

  const assetStatuses = ['available', 'in use', 'maintenance'];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]} onPress={() => goBack()}>
            <ThemedText type="smallBold">←</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>
            Assets
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}> 
          <View style={[styles.topControls, { zIndex: 10 }]}>
            <Pressable style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]} onPress={openAddAsset}>
              <ThemedText type="smallBold">+ Add Assets</ThemedText>
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
            <Text style={[styles.columnHeader, { width: 80, minWidth: 80, flex: 0 }]}>Count</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Value</Text>
            <Text style={styles.columnHeaderRight}>Actions</Text>
          </View>

          <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
            {filteredAssets.map((asset) => {
              const valueNumber = Number(asset.value);
              const displayedValue = Number.isFinite(valueNumber) ? valueNumber.toFixed(2) : '0.00';

              return (
                <View key={asset.id} style={styles.tableRow}>
                  <Text style={[styles.rowCell, { width: 60, minWidth: 60, flex: 0 }]} numberOfLines={1}>{asset.id}</Text>
                  <Text style={styles.rowCell} numberOfLines={1}>{asset.name}</Text>
                  <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>{asset.worksite?.name ?? 'Unassigned'}</Text>
                  <Text style={[styles.rowCell, { width: 80, minWidth: 80, flex: 0 }]} numberOfLines={1}>{asset.count}</Text>
                  <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>Rs. {displayedValue}</Text>
                  <View style={styles.actionsColumn}>
                  <Pressable style={styles.actionButtonIcon} onPress={() => { setSelectedViewAsset(asset); setViewDetailsOpen(true); }}>
                    <Text style={styles.actionIcon}>👁</Text>
                  </Pressable>
                  <Pressable style={styles.actionButtonIcon} onPress={() => openEditAsset(asset)}>
                    <Text style={styles.actionIcon}>✎</Text>
                  </Pressable>
                  <Pressable style={styles.actionButtonIconDelete} onPress={() => handleDeleteAsset(asset.id)}>
                    <Text style={styles.actionIcon}>🗑</Text>
                  </Pressable>
                </View>
              </View>
              );
            })}
          </ScrollView>
            </View>
          </ScrollView>
        </View>

        {formOpen && (
          <View style={styles.formOverlay}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <ThemedText type="title">{isEditing ? 'Update Asset' : 'Add Asset'}</ThemedText>
                <Pressable onPress={() => setFormOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Asset Name"
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
                  placeholder="Type"
                  value={formValues.type}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, type: value }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Location"
                  value={formValues.location}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, location: value }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Count"
                  keyboardType="numeric"
                  value={formValues.count}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, count: value }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Value"
                  keyboardType="numeric"
                  value={formValues.value}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, value: value }))}
                />
                <View style={[styles.fieldRow, { zIndex: statusPickerOpen ? 100 : 1 }]}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <Pressable style={styles.selectInput} onPress={() => setStatusPickerOpen((prev) => !prev)}>
                    <Text style={styles.selectText} numberOfLines={1}>{formValues.status}</Text>
                  </Pressable>
                </View>
                {statusPickerOpen && (
                  <View style={[styles.statusOptions, { position: 'absolute', top: 75, left: 0, right: 0, zIndex: 100 }]}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                    {assetStatuses.map((status) => (
                      <Pressable
                        key={status}
                        style={styles.statusOption}
                        onPress={() => {
                          setFormValues((prev) => ({ ...prev, status }));
                          setStatusPickerOpen(false);
                        }}
                      >
                        <Text style={styles.statusOptionText} numberOfLines={1}>{status}</Text>
                      </Pressable>
                    ))}
                  
                    </ScrollView>
                  </View>
                )}
                <Pressable style={styles.saveButton} onPress={handleSaveAsset}>
                  <Text style={styles.saveText}>Save Asset</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        )}

        <Modal visible={viewDetailsOpen} transparent animationType="fade" onRequestClose={() => setViewDetailsOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title">Asset Details</ThemedText>
                <Pressable onPress={() => setViewDetailsOpen(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody}>
                {selectedViewAsset && (
                  <>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Name</ThemedText>
                      <ThemedText>{selectedViewAsset.name}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Worksite</ThemedText>
                      <ThemedText>{selectedViewAsset.worksite?.name ?? 'Unassigned'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Type</ThemedText>
                      <ThemedText>{selectedViewAsset.type ?? '—'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Location</ThemedText>
                      <ThemedText>{selectedViewAsset.location ?? '—'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Status</ThemedText>
                      <ThemedText>{selectedViewAsset.status}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Count</ThemedText>
                      <ThemedText>{selectedViewAsset.count}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Value</ThemedText>
                      <ThemedText>Rs. {selectedViewAsset.value}</ThemedText>
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
    minWidth: 120,
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
  statusOption: {
    padding: Spacing.two,
  },
  statusOptionText: {
    color: theme.text,
    fontSize: 13,
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
