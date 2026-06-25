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

export default function ApprovalsPage() {
  const goBack = useGoBack();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();

  type Worksite = {
    id: number;
    name: string;
  };

    type Approval = {
      id: number;
      title: string;
      description?: string;
      status: string;
      amount?: string;
      date?: string;
      holder?: string;
      requested_by?: number | null;
      approved_by?: number | null;
      worksite_id?: number | null;
      worksite?: Worksite;
    };

  const initialFormState = {
    title: '',
    description: '',
    amount: '',
    date: '',
    holder: '',
    status: 'pending',
    requested_by: undefined,
    approved_by: undefined,
    worksite_id: null as number | null,
  };

  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [formValues, setFormValues] = useState(initialFormState as any);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedViewApproval, setSelectedViewApproval] = useState<Approval | null>(null);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [siteFilter, setSiteFilter] = useState<number | null>(null);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchApprovals = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/approvals`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setApprovals(Array.isArray(data) ? data : data.data || []);
      } catch (e) {
        console.error(e);
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

    fetchApprovals();
    fetchWorksites();
  }, [token]);

  const filteredApprovals = useMemo(() => {
    return approvals.filter((a) => {
      const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase());
      const matchesSite = siteFilter ? a.worksite_id === siteFilter : true;
      return matchesSearch && matchesSite;
    });
  }, [approvals, search, siteFilter]);

  const openAddApproval = () => {
    if (!token) {
      const message = 'Please log in before creating approvals.';
      Alert.alert('Not authenticated', message);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(message);
      }
      return;
    }

    setSelectedApproval(null);
    setIsEditing(false);
    setFormValues(initialFormState as any);
    setFormOpen(true);
  };

  const openEditApproval = (approval: Approval) => {
    setSelectedApproval(approval);
    setIsEditing(true);
    setFormValues({
      title: approval.title,
      description: approval.description ?? '',
      amount: approval.amount ?? '',
      date: approval.date ?? '',
      holder: approval.holder ?? '',
      status: approval.status,
      requested_by: approval.requested_by ?? undefined,
      approved_by: approval.approved_by ?? undefined,
      worksite_id: approval.worksite_id ?? null,
    });
    setFormOpen(true);
  };

  const handleSaveApproval = async () => {
    console.log('handleSaveApproval clicked', { token, formValues, isEditing, selectedApproval });

    if (!token) {
      const message = 'Please log in to save approvals.';
      Alert.alert('Not authenticated', message);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(message);
      }
      return;
    }
    if (!formValues.title?.trim()) {
      const message = 'Title is required.';
      Alert.alert('Validation error', message);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(message);
      }
      return;
    }

    const payload = {
      title: formValues.title,
      description: formValues.description || null,
      amount: formValues.amount || null,
      date: formValues.date || null,
      holder: formValues.holder || null,
      status: formValues.status,
      requested_by: formValues.requested_by || null,
      approved_by: formValues.approved_by || null,
      worksite_id: formValues.worksite_id,
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing && selectedApproval ? `${API_BASE_URL}/approvals/${selectedApproval.id}` : `${API_BASE_URL}/approvals`;

    console.log('Saving approval', { url, method, payload });

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const saved = await res.json().catch(() => ({}));
      console.log('Save response', { status: res.status, saved });

      if (!res.ok) {
        const msg = (saved && saved.message) ? saved.message : `Server returned ${res.status}`;
        console.error('Save approval failed', { status: res.status, body: saved });
        Alert.alert('Save failed', msg);
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(msg);
        }
        return;
      }

      const normalized = saved;
      setFormOpen(false);
      setSelectedApproval(null);
      setIsEditing(false);
      setApprovals((prev) => (isEditing && selectedApproval ? prev.map((p) => (p.id === selectedApproval.id ? normalized : p)) : [normalized, ...prev]));
      setSuccessMessage(isEditing ? 'Approval Updated Successfully!' : 'Approval Added Successfully!');
    } catch (e: any) {
      console.error('Network error saving approval', e);
      const message = e.message || 'Unable to save approval';
      Alert.alert('Save failed', message);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(message);
      }
    }
  };

  const handleDeleteApproval = async (approvalId: number) => {
    if (!token) {
      const message = 'Please log in before deleting approvals.';
      Alert.alert('Not authenticated', message);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(message);
      }
      return;
    }

    const res = await fetch(`${API_BASE_URL}/approvals/${approvalId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const message = errorBody.message || 'Unable to delete approval.';
      Alert.alert('Delete failed', message);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(message);
      }
      return;
    }

    setApprovals((prev) => prev.filter((p) => p.id !== approvalId));
    setSuccessMessage('Approval Deleted Successfully!');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]} onPress={() => goBack()}>
            <ThemedText type="smallBold">←</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>
            Approvals
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}> 
          {!token && (
            <Text style={styles.noticeText}>
              You must be logged in to load, create, or save approvals.
            </Text>
          )}
          <View style={[styles.topControls, { zIndex: 10 }]}>
            <TextInput
              style={[styles.searchInput, { flex: 1, minWidth: 160 }]}
              placeholder="Search Here"
              placeholderTextColor={theme.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            <Pressable style={styles.addButton} onPress={openAddApproval}>
              <ThemedText type="smallBold" style={{ color: '#1f1d21' }}>+ Add Approval</ThemedText>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: '100%' }}>
          <View style={[styles.tableCard, { borderColor: '#1f1f1f', borderWidth: 2 }]}>
            <View style={styles.tableHeader}>
              <Text style={[styles.columnHeader, { flex: 0.5, textAlign: 'center' }]}>ID</Text>
              <Text style={[styles.columnHeader, { flex: 1.5, textAlign: 'center' }]}>Description</Text>
              <Text style={[styles.columnHeader, { flex: 1.5, textAlign: 'center' }]}>Amount</Text>
              <Text style={[styles.columnHeader, { flex: 1.5, textAlign: 'center' }]}>Date</Text>
              <Text style={[styles.columnHeader, { flex: 1.5, textAlign: 'center' }]}>Holder</Text>
              <Text style={[styles.columnHeader, { flex: 1.5, textAlign: 'center' }]}>Status</Text>
              <Text style={[styles.columnHeader, { flex: 1, textAlign: 'center' }]}>Action</Text>
            </View>
            <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
              {filteredApprovals.map((a, index) => (
                <View key={a.id} style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                  <Text style={[styles.rowCell, { flex: 0.5, textAlign: 'center' }]} numberOfLines={1}>{a.id}</Text>
                  <Text style={[styles.rowCell, { flex: 1.5, textAlign: 'center' }]} numberOfLines={1}>{a.title}</Text>
                  <Text style={[styles.rowCell, { flex: 1.5, textAlign: 'center' }]} numberOfLines={1}>{a.amount ?? '—'}</Text>
                  <Text style={[styles.rowCell, { flex: 1.5, textAlign: 'center' }]} numberOfLines={1}>{a.date ?? '—'}</Text>
                  <Text style={[styles.rowCell, { flex: 1.5, textAlign: 'center' }]} numberOfLines={1}>{a.holder ?? '—'}</Text>
                  <View style={[styles.rowCell, { flex: 1.5, alignItems: 'center' }]}>
                    <View style={[styles.statusPill, a.status.toLowerCase() === 'approved' ? styles.statusPillGreen : a.status.toLowerCase() === 'reject' || a.status.toLowerCase() === 'rejected' ? styles.statusPillRed : styles.statusPillYellow]}>
                      <Text style={styles.statusPillText}>{a.status}</Text>
                    </View>
                  </View>
                  <View style={[styles.rowCell, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
                    {a.status.toLowerCase() === 'pending' && (
                    <Pressable style={[styles.actionButtonIconDelete, { backgroundColor: '#3b82f6' }]} onPress={() => openEditApproval(a)}>
                      <Text style={styles.actionIcon}>✎</Text>
                    </Pressable>
                    )}
                    <Pressable style={styles.actionButtonIconDelete} onPress={() => handleDeleteApproval(a.id)}>
                      <Text style={styles.actionIcon}>🗑</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
            </View>
          </ScrollView>
        </View>

        {formOpen && (
          <View style={styles.formOverlay}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <ThemedText type="title">{isEditing ? 'Update Approval' : 'Add Approval'}</ThemedText>
                <Pressable onPress={() => setFormOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Title (Description)"
                  value={formValues.title}
                  onChangeText={(v) => setFormValues((p: any) => ({ ...p, title: v }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Amount (e.g. Rs 18,520)"
                  value={formValues.amount}
                  onChangeText={(v) => setFormValues((p: any) => ({ ...p, amount: v }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Date (YYYY-MM-DD)"
                  value={formValues.date}
                  onChangeText={(v) => setFormValues((p: any) => ({ ...p, date: v }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Holder (e.g. Udayanga)"
                  value={formValues.holder}
                  onChangeText={(v) => setFormValues((p: any) => ({ ...p, holder: v }))}
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
                            setFormValues((prev: any) => ({ ...prev, worksite_id: site.id }));
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
                {!isEditing && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.statusList}>
                    {['Pending', 'Approved', 'Reject'].map((s) => (
                      <Pressable
                        key={s}
                        style={[styles.statusOption, formValues.status.toLowerCase() === s.toLowerCase() && styles.statusOptionSelected]}
                        onPress={() => setFormValues((p: any) => ({ ...p, status: s }))}
                      >
                        <Text style={[styles.statusOptionText, formValues.status.toLowerCase() === s.toLowerCase() && styles.statusOptionTextSelected]}>{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                )}
                <Pressable
                  style={styles.saveButton}
                  onPress={() => {
                    console.log('Save button pressed');
                    handleSaveApproval();
                  }}
                >
                  <Text style={styles.saveText}>Save Approval</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        )}

        <Modal visible={viewDetailsOpen} transparent animationType="fade" onRequestClose={() => setViewDetailsOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title">Approval Details</ThemedText>
                <Pressable onPress={() => setViewDetailsOpen(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody}>
                {selectedViewApproval && (
                  <>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Title</ThemedText>
                      <ThemedText>{selectedViewApproval.title}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Worksite</ThemedText>
                      <ThemedText>{selectedViewApproval.worksite?.name ?? 'Unassigned'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Description</ThemedText>
                      <ThemedText>{selectedViewApproval.description ?? '—'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Status</ThemedText>
                      <ThemedText>{selectedViewApproval.status}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Requested By</ThemedText>
                      <ThemedText>{selectedViewApproval.requested_by ?? '—'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Approved By</ThemedText>
                      <ThemedText>{selectedViewApproval.approved_by ?? '—'}</ThemedText>
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
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: theme.backgroundSelected,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
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
    fontSize: 10,
  },
  tableCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.backgroundElement,
  },
  rowEven: {
    backgroundColor: theme.background,
  },
  rowOdd: {
    backgroundColor: theme.backgroundSelected,
  },
  statusPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillGreen: {
    backgroundColor: '#10b981',
  },
  statusPillRed: {
    backgroundColor: '#ef4444',
  },
  statusPillYellow: {
    backgroundColor: '#eab308',
  },
  statusPillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
  noticeText: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: Spacing.two,
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
