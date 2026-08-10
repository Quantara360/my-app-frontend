import React, { useEffect, useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Alert, Modal, Platform, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { BackgroundPattern } from '@/components/BackgroundPattern';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SuccessModal } from '@/components/success-modal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE_URL } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { useGoBack } from '@/hooks/use-go-back';

type PerformanceBond = {
  id: number;
  valid_period: string;
  bond_name: string;
  bond_number: string;
  date: string;
  description: string;
  amount: number;
  tender_status: string;
};

const TENDER_STATUS_OPTIONS = ['Open', 'Closed', 'Pending', 'Awarded', 'Rejected', 'Cancelled'];

const initialForm = {
  valid_period: '',
  bond_name: '',
  bond_number: '',
  date: '',
  description: '',
  amount: '',
  tender_status: 'Open',
};

function normalizePerformanceBond(b: any): PerformanceBond {
  return {
    id: Number(b.id ?? 0),
    valid_period: String(b.valid_period ?? ''),
    bond_name: String(b.bond_name ?? ''),
    bond_number: String(b.bond_number ?? ''),
    date: String(b.date ?? ''),
    description: String(b.description ?? ''),
    amount: Number(b.amount ?? 0),
    tender_status: String(b.tender_status ?? ''),
  };
}

export default function PerformanceBondsPage() {
  const goBack = useGoBack();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [bonds, setBonds] = useState<PerformanceBond[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBond, setSelectedBond] = useState<PerformanceBond | null>(null);
  const [formValues, setFormValues] = useState({ ...initialForm });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<PerformanceBond | null>(null);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const webDateInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/performance-bonds`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setBonds(Array.isArray(data) ? data.map(normalizePerformanceBond) : []))
      .catch(console.error);
  }, [token]);

  const filtered = useMemo(() =>
    bonds.filter((b) =>
      [b.valid_period, b.bond_name, b.bond_number, b.tender_status, b.description, String(b.amount), b.date]
        .join(' ').toLowerCase().includes(search.toLowerCase())
    ), [bonds, search]);

  const openAdd = () => {
    setSelectedBond(null);
    setIsEditing(false);
    setFormValues({ ...initialForm });
    setSelectedDate(new Date());
    setShowDatePicker(false);
    setFormOpen(true);
  };

  const openEdit = (b: PerformanceBond) => {
    setSelectedBond(b);
    setIsEditing(true);
    const parsedDate = b.date ? new Date(b.date) : new Date();
    setSelectedDate(parsedDate);
    setShowDatePicker(false);
    setFormValues({
      valid_period: b.valid_period,
      bond_name: b.bond_name,
      bond_number: b.bond_number,
      date: b.date,
      description: b.description,
      amount: String(b.amount),
      tender_status: b.tender_status,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    const payload = {
      valid_period: formValues.valid_period,
      bond_name: formValues.bond_name,
      bond_number: formValues.bond_number,
      date: formValues.date || selectedDate.toISOString().split('T')[0],
      description: formValues.description,
      amount: Number(formValues.amount) || 0,
      tender_status: formValues.tender_status,
    };
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing && selectedBond
      ? `${API_BASE_URL}/performance-bonds/${selectedBond.id}`
      : `${API_BASE_URL}/performance-bonds`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.message || 'Failed to save');
      const normalized = normalizePerformanceBond(saved);
      setBonds((prev) => isEditing && selectedBond ? prev.map((p) => p.id === selectedBond.id ? normalized : p) : [normalized, ...prev]);
      setFormOpen(false);
      setSuccessTitle(isEditing ? 'Performance Bond Updated!' : 'Performance Bond Added!');
      setShowSuccess(true);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/performance-bonds/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { Alert.alert('Error', 'Failed to delete'); return; }
    setBonds((prev) => prev.filter((b) => b.id !== id));
    setSuccessTitle('Performance Bond Deleted!');
    setShowSuccess(true);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <BackgroundPattern />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]} onPress={() => goBack()}>
            <ThemedText type="smallBold">←</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>Performance Bonds</ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.topControls}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={theme.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {!isAdmin && (
              <Pressable style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]} onPress={openAdd}>
                <ThemedText type="smallBold">+ Add</ThemedText>
              </Pressable>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: '100%' }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.columnHeader, { width: 50, minWidth: 50, flex: 0 }]}>ID</Text>
                <Text style={[styles.columnHeader, { width: 110, minWidth: 110, flex: 0 }]}>Valid Period</Text>
                <Text style={[styles.columnHeader, { width: 110, minWidth: 110, flex: 0 }]}>Bond Name</Text>
                <Text style={[styles.columnHeader, { width: 110, minWidth: 110, flex: 0 }]}>Bond Number</Text>
                <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Date</Text>
                <Text style={[styles.columnHeader, { width: 150, minWidth: 150, flex: 0 }]}>Description</Text>
                <Text style={[styles.columnHeader, { width: 100, minWidth: 100, flex: 0 }]}>Amount</Text>
                <Text style={[styles.columnHeader, { width: 110, minWidth: 110, flex: 0 }]}>Tender Status</Text>
                <Text style={styles.columnHeaderRight}>Actions</Text>
              </View>
              <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
                {filtered.map((b) => (
                  <View key={b.id} style={styles.tableRow}>
                    <Text style={[styles.rowCell, { width: 50, minWidth: 50, flex: 0 }]} numberOfLines={1}>{b.id}</Text>
                    <Text style={[styles.rowCell, { width: 110, minWidth: 110, flex: 0 }]} numberOfLines={1}>{b.valid_period}</Text>
                    <Text style={[styles.rowCell, { width: 110, minWidth: 110, flex: 0 }]} numberOfLines={1}>{b.bond_name}</Text>
                    <Text style={[styles.rowCell, { width: 110, minWidth: 110, flex: 0 }]} numberOfLines={1}>{b.bond_number}</Text>
                    <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>{b.date}</Text>
                    <Text style={[styles.rowCell, { width: 150, minWidth: 150, flex: 0 }]} numberOfLines={2}>{b.description}</Text>
                    <Text style={[styles.rowCell, { width: 100, minWidth: 100, flex: 0 }]} numberOfLines={1}>{Number(b.amount).toLocaleString()}</Text>
                    <Text style={[styles.rowCell, { width: 110, minWidth: 110, flex: 0 }]} numberOfLines={1}>{b.tender_status}</Text>
                    <View style={styles.actionsColumn}>
                      <Pressable style={styles.actionButtonIcon} onPress={() => { setViewItem(b); setViewOpen(true); }}>
                        <Text style={styles.actionIcon}>👁</Text>
                      </Pressable>
                      <Pressable style={styles.actionButtonIcon} onPress={() => openEdit(b)}>
                        <Text style={styles.actionIcon}>✎</Text>
                      </Pressable>
                      <Pressable style={styles.actionButtonIconDelete} onPress={() => handleDelete(b.id)}>
                        <Text style={styles.actionIcon}>🗑</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
                {filtered.length === 0 && (
                  <View style={styles.emptyRow}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>No performance bonds found.</ThemedText>
                  </View>
                )}
              </ScrollView>
            </View>
          </ScrollView>
        </View>

        {/* Add/Edit Modal */}
        {formOpen && (
          <View style={styles.formOverlay}>
            <View style={[styles.formCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.formHeader}>
                <ThemedText type="title">{isEditing ? 'Edit Performance Bond' : 'Add Performance Bond'}</ThemedText>
                <Pressable onPress={() => setFormOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Valid Period</Text>
                <TextInput style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]} placeholder="e.g. 12 Months" placeholderTextColor={theme.textSecondary} value={formValues.valid_period} onChangeText={(v) => setFormValues((p) => ({ ...p, valid_period: v }))} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Bond Name</Text>
                <TextInput style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]} placeholder="Bond Name" placeholderTextColor={theme.textSecondary} value={formValues.bond_name} onChangeText={(v) => setFormValues((p) => ({ ...p, bond_name: v }))} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Bond Number</Text>
                <TextInput style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]} placeholder="Bond Number" placeholderTextColor={theme.textSecondary} value={formValues.bond_number} onChangeText={(v) => setFormValues((p) => ({ ...p, bond_number: v }))} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Date</Text>
                {Platform.OS === 'web' ? (
                  <View style={{ position: 'relative' }}>
                    <Pressable style={[styles.textInput, { justifyContent: 'center', borderColor: theme.backgroundSelected }]} onPress={() => { webDateInputRef.current?.showPicker?.(); webDateInputRef.current?.click(); }}>
                      <Text style={{ color: theme.text }}>{formValues.date || selectedDate.toISOString().split('T')[0]}</Text>
                    </Pressable>
                    <input
                      ref={webDateInputRef}
                      type="date"
                      value={formValues.date || selectedDate.toISOString().split('T')[0]}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setFormValues((prev) => ({ ...prev, date: value }));
                        const parsed = new Date(value);
                        if (!Number.isNaN(parsed.getTime())) setSelectedDate(parsed);
                      }}
                      style={{ position: 'absolute', opacity: 0, width: 1, height: 1, zIndex: -1, pointerEvents: 'none' }}
                    />
                  </View>
                ) : (
                  <>
                    <Pressable style={[styles.textInput, { justifyContent: 'center', borderColor: theme.backgroundSelected }]} onPress={() => setShowDatePicker(true)}>
                      <Text style={{ color: theme.text }}>{selectedDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                    </Pressable>
                    {showDatePicker && (
                      <>
                        <DateTimePicker
                          value={selectedDate}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={(_event, date) => {
                            setShowDatePicker(Platform.OS === 'ios');
                            if (date) {
                              setSelectedDate(date);
                              setFormValues((prev) => ({ ...prev, date: date.toISOString().split('T')[0] }));
                            }
                          }}
                        />
                        {Platform.OS === 'ios' && (
                          <Pressable onPress={() => setShowDatePicker(false)} style={{ alignSelf: 'flex-end', padding: 8 }}>
                            <Text style={{ color: theme.text, fontWeight: '600' }}>Done</Text>
                          </Pressable>
                        )}
                      </>
                    )}
                  </>
                )}

                <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
                <TextInput style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected, height: 80, textAlignVertical: 'top' }]} placeholder="Description" placeholderTextColor={theme.textSecondary} multiline value={formValues.description} onChangeText={(v) => setFormValues((p) => ({ ...p, description: v }))} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Amount</Text>
                <TextInput style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]} placeholder="0.00" placeholderTextColor={theme.textSecondary} keyboardType="decimal-pad" value={formValues.amount} onChangeText={(v) => setFormValues((p) => ({ ...p, amount: v }))} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Tender Status</Text>
                <View style={{ position: 'relative', zIndex: 20 }}>
                  <Pressable style={[styles.textInput, { justifyContent: 'center', borderColor: theme.backgroundSelected }]} onPress={() => setStatusPickerOpen((p) => !p)}>
                    <Text style={{ color: theme.text }}>{formValues.tender_status || 'Select Status'}</Text>
                  </Pressable>
                  {statusPickerOpen && (
                    <View style={[styles.statusOptions, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                      {TENDER_STATUS_OPTIONS.map((opt) => (
                        <Pressable key={opt} style={styles.statusOption} onPress={() => { setFormValues((p) => ({ ...p, tender_status: opt })); setStatusPickerOpen(false); }}>
                          <Text style={[styles.statusOptionText, { color: theme.text }]}>{opt}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                <Pressable style={[styles.saveButton, { backgroundColor: '#28a745' }]} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>{isEditing ? 'Update' : 'Save'}</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        )}

        {/* View Details Modal */}
        <Modal visible={viewOpen} transparent animationType="fade" onRequestClose={() => setViewOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.formHeader}>
                <ThemedText type="title">Performance Bond Details</ThemedText>
                <Pressable onPress={() => setViewOpen(false)}><Text style={styles.closeText}>✕</Text></Pressable>
              </View>
              {viewItem && (
                <ScrollView style={{ padding: Spacing.three }}>
                  {[
                    ['Valid Period', viewItem.valid_period],
                    ['Bond Name', viewItem.bond_name],
                    ['Bond Number', viewItem.bond_number],
                    ['Date', viewItem.date],
                    ['Description', viewItem.description],
                    ['Amount', Number(viewItem.amount).toLocaleString()],
                    ['Tender Status', viewItem.tender_status],
                  ].map(([label, val]) => (
                    <View key={label} style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{val}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <SuccessModal visible={showSuccess} title={successTitle} onClose={() => setShowSuccess(false)} />
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, paddingBottom: BottomTabInset, backgroundColor: 'transparent' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  backButton: { padding: Spacing.two, borderRadius: 16 },
  pageTitle: { flex: 1, textAlign: 'center', color: theme.text },
  card: { flex: 1, width: '100%', borderRadius: 28, padding: Spacing.three, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  topControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.three },
  searchInput: { flex: 1, borderWidth: 1, borderColor: theme.backgroundSelected, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, color: theme.text, backgroundColor: 'transparent' },
  addButton: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: 12 },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: Spacing.two, borderBottomWidth: 1, borderBottomColor: theme.backgroundSelected },
  columnHeader: { flex: 1, minWidth: 100, fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' },
  columnHeaderRight: { width: 110, minWidth: 110, fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', textAlign: 'right' },
  tableBody: { maxHeight: 420 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: Spacing.two, borderBottomWidth: 1, borderBottomColor: theme.backgroundSelected, alignItems: 'center', gap: Spacing.one },
  rowCell: { flex: 1, minWidth: 100, fontSize: 13, color: theme.text },
  actionsColumn: { width: 110, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  actionButtonIcon: { padding: 6, borderRadius: 8, backgroundColor: theme.backgroundSelected },
  actionButtonIconDelete: { padding: 6, borderRadius: 8, backgroundColor: '#ff6b6b22' },
  actionIcon: { fontSize: 14 },
  emptyRow: { padding: Spacing.four, alignItems: 'center' },
  formOverlay: { position: Platform.OS === 'web' ? 'fixed' : 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  formCard: { width: '95%', maxWidth: 500, maxHeight: '90%', borderRadius: 24, overflow: 'hidden' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderBottomWidth: 1, borderBottomColor: theme.backgroundSelected },
  closeText: { fontSize: 20, color: theme.textSecondary },
  formBody: { padding: Spacing.four },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: Spacing.two },
  textInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Platform.select({ web: 10, default: Spacing.two }), marginBottom: 4, fontSize: 14 },
  saveButton: { marginTop: Spacing.three, paddingVertical: Spacing.three, borderRadius: 14, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  statusOptions: { position: 'absolute', top: '100%', left: 0, right: 0, borderWidth: 1, borderRadius: 12, zIndex: 30, overflow: 'hidden' },
  statusOption: { paddingVertical: 10, paddingHorizontal: Spacing.three },
  statusOptionText: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '90%', maxWidth: 500, maxHeight: '80%', borderRadius: 24, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.backgroundSelected },
  detailLabel: { width: 130, fontSize: 13, fontWeight: '600' },
  detailValue: { flex: 1, fontSize: 13 },
});
