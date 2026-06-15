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

type Worksite = {
  id: number;
  name: string;
};

type PeticashTransaction = {
  id: number;
  type: string;
  amount: number;
  description?: string;
  transaction_date: string;
  worksite_id?: number | null;
  worksite?: Worksite;
};

const initialFormState = {
  type: 'expense',
  amount: '',
  description: '',
  transaction_date: '',
  worksite_id: null as number | null,
};

const normalizeTransaction = (t: any): PeticashTransaction => ({
  id: Number(t.id ?? 0),
  type: String(t.type ?? 'expense'),
  amount: Number(t.amount ?? 0),
  description: t.description ? String(t.description) : undefined,
  transaction_date: t.transaction_date ? String(t.transaction_date) : new Date().toISOString().split('T')[0],
  worksite_id: t.worksite_id ? Number(t.worksite_id) : null,
  worksite: t.worksite,
});

export default function PeticashPage() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();

  const [transactions, setTransactions] = useState<PeticashTransaction[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PeticashTransaction | null>(null);
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formValues, setFormValues] = useState(initialFormState);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [siteFilter, setSiteFilter] = useState<number | null>(null);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const webDateInputRef = useRef<HTMLInputElement | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedViewItem, setSelectedViewItem] = useState<PeticashTransaction | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const authHeader = { Authorization: `Bearer ${token}` };

        const resp = await fetch(`${API_BASE_URL}/peticash`, {
          headers: { Accept: 'application/json', ...authHeader },
        });
        const data = await resp.json();
        const normalized = Array.isArray(data) ? data.map(normalizeTransaction) : (data.data || []).map(normalizeTransaction);
        setTransactions(normalized);
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

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch = t.description?.toLowerCase().includes(search.toLowerCase()) || false;
      const matchesSite = siteFilter ? t.worksite_id === siteFilter : true;
      return (search === '' || matchesSearch) && matchesSite;
    });
  }, [transactions, search, siteFilter]);

  const openAddTransaction = () => {
    setSelectedTransaction(null);
    setIsEditing(false);
    setFormValues(initialFormState);
    setTransactionDate(new Date());
    setShowDatePicker(false);
    setSitePickerOpen(false);
    setFormOpen(true);
  };

  const openEditTransaction = (transaction: PeticashTransaction) => {
    setSelectedTransaction(transaction);
    setIsEditing(true);
    const parsedDate = transaction.transaction_date ? new Date(transaction.transaction_date) : new Date();
    setFormValues({
      type: transaction.type,
      amount: String(transaction.amount ?? 0),
      description: transaction.description ?? '',
      transaction_date: transaction.transaction_date ?? '',
      worksite_id: transaction.worksite_id ?? null,
    });
    setTransactionDate(parsedDate);
    setShowDatePicker(false);
    setSitePickerOpen(false);
    setFormOpen(true);
  };

  const handleSaveTransaction = async () => {
    if (!token) return;

    if (!formValues.amount.trim()) {
      Alert.alert('Validation error', 'Amount is required.');
      return;
    }

    const payload = {
      type: formValues.type,
      amount: Number(formValues.amount),
      description: formValues.description || null,
      transaction_date: formValues.transaction_date || transactionDate.toISOString().split('T')[0],
      worksite_id: formValues.worksite_id,
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing && selectedTransaction ? `${API_BASE_URL}/peticash/${selectedTransaction.id}` : `${API_BASE_URL}/peticash`;

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

      const savedTransaction = await response.json();
      if (!response.ok) {
        throw new Error(savedTransaction.message || 'Unable to save transaction');
      }

      const normalized = normalizeTransaction(savedTransaction);
      setFormOpen(false);
      setTransactions((prev) => {
        if (isEditing && selectedTransaction) {
          return prev.map((t) => (t.id === selectedTransaction.id ? normalized : t));
        }
        return [normalized, ...prev];
      });
      setSuccessMessage(isEditing ? 'Transaction Updated Successfully!' : 'Transaction Added Successfully!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to save transaction');
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/peticash/${transactionId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      Alert.alert('Delete failed', errorBody.message || 'Unable to delete transaction.');
      return;
    }

    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    setSuccessMessage('Transaction Deleted Successfully!');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]} onPress={() => router.back()}>
            <ThemedText type="smallBold">←</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>
            Peticash
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.topControls}>
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
              style={styles.searchInput}
              placeholder="Search by description"
              placeholderTextColor={theme.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            <Pressable style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]} onPress={openAddTransaction}>
              <ThemedText type="smallBold">+ Add</ThemedText>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: '100%' }}>
              <View style={styles.tableHeader}>
            <Text style={[styles.columnHeader, { width: 60, minWidth: 60, flex: 0 }]}>ID</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Site</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Type</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Amount</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Date</Text>
            <Text style={styles.columnHeaderRight}>Actions</Text>
          </View>

          <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
            {filteredTransactions.map((t) => (
              <View key={t.id} style={styles.tableRow}>
                <Text style={[styles.rowCell, { width: 60, minWidth: 60, flex: 0 }]} numberOfLines={1}>
                  {t.id}
                </Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>
                  {t.worksite?.name ?? 'Unassigned'}
                </Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>
                  {t.type}
                </Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>
                  {t.amount}
                </Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>
                  {t.transaction_date}
                </Text>
                <View style={styles.actionsColumn}>
                  <Pressable style={styles.actionButtonIcon} onPress={() => { setSelectedViewItem(t); setViewDetailsOpen(true); }}>
                    <Text style={styles.actionIcon}>👁</Text>
                  </Pressable>
                  <Pressable style={styles.actionButtonIcon} onPress={() => openEditTransaction(t)}>
                    <Text style={styles.actionIcon}>✎</Text>
                  </Pressable>
                  <Pressable style={styles.actionButtonIconDelete} onPress={() => handleDeleteTransaction(t.id)}>
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
                <ThemedText type="title">{isEditing ? 'Update Transaction' : 'Add Transaction'}</ThemedText>
                <Pressable onPress={() => setFormOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Type</Text>
                  <View style={styles.typeList}>
                    {['income', 'expense'].map((typeOption) => (
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

                <TextInput
                  style={styles.textInput}
                  placeholder="Amount"
                  keyboardType="decimal-pad"
                  value={formValues.amount}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, amount: value }))}
                />

                <TextInput
                  style={styles.textInput}
                  placeholder="Description"
                  value={formValues.description}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, description: value }))}
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
                    <Text style={styles.fieldLabel}>Transaction Date</Text>
                    <Pressable
                      style={[styles.pill, { backgroundColor: theme.background }]}
                      onPress={() => {
                        webDateInputRef.current?.showPicker?.();
                        webDateInputRef.current?.click();
                      }}
                    >
                      <Text style={styles.pillText}>
                        {formValues.transaction_date || transactionDate.toISOString().split('T')[0]}
                      </Text>
                    </Pressable>
                    <input
                      ref={webDateInputRef}
                      type="date"
                      value={formValues.transaction_date || transactionDate.toISOString().split('T')[0]}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setFormValues((prev) => ({ ...prev, transaction_date: value }));
                        const parsedDate = new Date(value);
                        if (!Number.isNaN(parsedDate.getTime())) {
                          setTransactionDate(parsedDate);
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
                      <Text style={styles.fieldLabel}>Transaction Date</Text>
                      <Pressable
                        style={[styles.pill, { backgroundColor: theme.background }]}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Text style={styles.pillText}>
                          {transactionDate.toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </Pressable>
                    </View>
                    {showDatePicker && (
                      <DateTimePicker
                        value={transactionDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_event, selectedDate) => {
                          setShowDatePicker(Platform.OS === 'ios');
                          if (selectedDate) {
                            setTransactionDate(selectedDate);
                            setFormValues((prev) => ({
                              ...prev,
                              transaction_date: selectedDate.toISOString().split('T')[0],
                            }));
                          }
                        }}
                      />
                    )}
                  </>
                )}

                <Pressable style={styles.saveButton} onPress={handleSaveTransaction}>
                  <Text style={styles.saveText}>Save Transaction</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        )}
        <Modal visible={viewDetailsOpen} transparent animationType="fade" onRequestClose={() => setViewDetailsOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title">Transaction Details</ThemedText>
                <Pressable onPress={() => setViewDetailsOpen(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody}>
                {selectedViewItem && (
                  <>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Type</ThemedText>
                      <ThemedText>{selectedViewItem.type}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Worksite</ThemedText>
                      <ThemedText>{selectedViewItem.worksite?.name ?? 'Unassigned'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Amount</ThemedText>
                      <ThemedText>{selectedViewItem.amount}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Description</ThemedText>
                      <ThemedText>{selectedViewItem.description ?? '—'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Date</ThemedText>
                      <ThemedText>{selectedViewItem.transaction_date}</ThemedText>
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
