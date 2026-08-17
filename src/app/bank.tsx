import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BackgroundPattern } from '@/components/BackgroundPattern';
import { SuccessModal } from '@/components/success-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGoBack } from '@/hooks/use-go-back';
import { getBankEntries, createBankEntry, updateBankEntry, deleteBankEntry, getLedgerPrevBalance, setLedgerPrevBalance } from '@/services/accountsService';
import { exportLedgerToExcel } from '@/utils/exportLedger';

type BankEntry = {
  id: number;
  date: string;
  chequeNo: string;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number;
};

/** Returns today's date string in YYYY-MM-DD using Sri Lanka timezone (UTC+5:30) */
const getSriLankaDate = (): string => {
  const now = new Date();
  const offset = 330; // Sri Lanka: UTC+5:30 = 330 minutes
  const local = new Date(now.getTime() + offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

export default function BankPage() {
  const goBack = useGoBack();
  const theme = useTheme();
  const styles = createStyles(theme);

  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [transactionType, setTransactionType] = useState<'debit' | 'credit'>('debit');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [manualPrevBalanceStr, setManualPrevBalanceStr] = useState<string | null>(null);

  useEffect(() => {
    getLedgerPrevBalance('bank')
      .then((val) => { if (val !== null) setManualPrevBalanceStr(val.toFixed(2)); })
      .catch((err) => console.warn('[Bank] prevBalance fetch error', err));
  }, []);

  // Load persisted entries from backend on mount
  useEffect(() => {
    getBankEntries()
      .then((rows) => {
        const mapped = rows.map((r) => ({
          id:          r.id,
          date:        r.date,
          chequeNo:    r.cheque_no ?? '',
          description: r.description ?? '',
          debit:       r.debit,
          credit:      r.credit,
          balance:     r.balance,
        }));
        setEntries(mapped);
      })
      .catch((err) => console.warn('[Bank] fetch error', err));
  }, []);
  const [form, setForm] = useState({
    date: getSriLankaDate(),
    chequeNo: '',
    description: '',
    amount: '',
    prevBalance: '0.00',
  });

  // (Removed from here, moved below)

  const totalDebit = entries.reduce((s, e) => s + (e.debit ?? 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit ?? 0), 0);

  /** Closing balance = balance field of the last entry in the previous calendar month */
  const computedPrevMonthBalance = (() => {
    const now = new Date();
    const offset = 330; // Sri Lanka UTC+5:30
    const local = new Date(now.getTime() + offset * 60 * 1000);
    const year = local.getUTCFullYear();
    const month = local.getUTCMonth();
    const prevMonthStart = new Date(Date.UTC(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, 1));
    const prevMonthEnd = new Date(Date.UTC(year, month, 1));
    // Find entries that fall within the previous month, sorted by date ascending
    const prevMonthEntries = entries
      .filter((e) => {
        const d = new Date(e.date);
        return d >= prevMonthStart && d < prevMonthEnd;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (prevMonthEntries.length === 0) return 0;
    // Return the balance of the last entry (closing balance of the previous month)
    return prevMonthEntries[prevMonthEntries.length - 1].balance;
  })();

  const prevMonthBalance = manualPrevBalanceStr !== null 
    ? parseFloat(manualPrevBalanceStr) 
    : computedPrevMonthBalance;

  const currentBalance = prevMonthBalance + totalCredit - totalDebit;

  // Calculate running balances chronologically first
  const entriesWithBalances = [...entries]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((acc, entry) => {
      const prevBal = acc.length > 0 ? acc[acc.length - 1].runningBalance : prevMonthBalance;
      const runningBalance = prevBal + (entry.credit ?? 0) - (entry.debit ?? 0);
      acc.push({ ...entry, runningBalance });
      return acc;
    }, [] as (BankEntry & { runningBalance: number })[]);

  // Then filter and sort for display
  const filtered = entriesWithBalances
    .filter(
      (e) =>
        e.chequeNo.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === 'asc' ? da - db : db - da;
    });

  const handleSave = () => {
    if (!form.date) { Alert.alert('Validation', 'Date is required.'); return; }
    const debit  = transactionType === 'debit'  && form.amount ? parseFloat(form.amount) : null;
    const credit = transactionType === 'credit' && form.amount ? parseFloat(form.amount) : null;
    const prevBalance = parseFloat(form.prevBalance || '0');

    setLedgerPrevBalance('bank', parseFloat(form.prevBalance || '0'))
      .then(() => setManualPrevBalanceStr(form.prevBalance))
      .catch((err) => console.warn('[Bank] prevBalance save error', err));

    const newBalance = prevBalance + (credit ?? 0) - (debit ?? 0);
    
    if (editingId) {
      setEntries((prev) => prev.map((e) => e.id === editingId ? { ...e, date: form.date, chequeNo: form.chequeNo, description: form.description, debit, credit, balance: newBalance } : e));
      updateBankEntry(editingId, {
        date:        form.date,
        cheque_no:   form.chequeNo || null,
        description: form.description || null,
        debit:       debit,
        credit:      credit,
        balance:     newBalance,
      }).catch((err) => console.warn('update error', err));
    } else {
      const entry = {
        id: Date.now(),
        date: form.date,
        chequeNo: form.chequeNo,
        description: form.description,
        debit,
        credit,
        balance: newBalance,
      };
      setEntries((prev) => [...prev, entry]);
      createBankEntry({
        date:        entry.date,
        cheque_no:   entry.chequeNo || null,
        description: entry.description || null,
        debit:       entry.debit,
        credit:      entry.credit,
        balance:     entry.balance,
      }).catch((err) => console.warn('save error', err));
    }
    
    setForm({ date: getSriLankaDate(), chequeNo: '', description: '', amount: '', prevBalance: prevMonthBalance.toFixed(2) });
    setTransactionType('debit');
    setEditingId(null);
    setAddModalOpen(false);
    setSuccessVisible(true);
  };

  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    setForm({
      date: entry.date,
      chequeNo: entry.chequeNo || '',
      description: entry.description || '',
      amount: (entry.debit || entry.credit || '').toString(),
      prevBalance: prevMonthBalance.toFixed(2),
    });
    setTransactionType(entry.debit != null ? 'debit' : 'credit');
    setAddModalOpen(true);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        deleteBankEntry(id).catch(err => console.warn('delete error', err));
      } }
    ]);
  };

  const columns = ['Date', 'Cheque No', 'Description', 'Credit', 'Debit', 'Balance', 'Actions'];

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#F1E7DF' }]}>
      <BackgroundPattern />
      <SafeAreaView style={styles.safeArea}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]}
            onPress={() => goBack()}
          >
            <Text style={{ fontSize: 20, color: '#555', fontWeight: 'bold' }}>{'←'}</Text>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>
            Bank
          </ThemedText>
        </View>

        {/* Main card + summary in a scrollable container */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.three, paddingBottom: Spacing.four }}
        >
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {/* Controls row */}
            <View style={styles.controlsRow}>
              {/* Search */}
              <View style={styles.searchWrapper}>
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search Cheque No"
                  placeholderTextColor="#aaa"
                  value={search}
                  onChangeText={setSearch}
                />
                <Text style={styles.searchIcon}>🔍</Text>
              </View>

              {/* Sort toggle */}
              <Pressable
                style={[
                  styles.sortBtn,
                  { backgroundColor: sortOrder === 'asc' ? '#6366f1' : '#f59e0b' },
                ]}
                onPress={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              >
                <Text style={styles.sortBtnText}>
                  {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                </Text>
              </Pressable>

              {/* Export button */}
              <Pressable 
                style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}
                onPress={() => exportLedgerToExcel('Bank_Ledger', filtered, prevMonthBalance)}
              >
                <Text style={styles.actionBtnText}>⬇ Export</Text>
              </Pressable>

              {/* Add button */}
              <Pressable
                style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}
                onPress={() => {
                  setForm((prev) => ({ ...prev, prevBalance: prevMonthBalance.toFixed(2) }));
                  setAddModalOpen(true);
                }}
              >
                <Text style={styles.actionBtnText}>＋ Add</Text>
              </Pressable>
            </View>

            {/* Table */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 560 }}>
                {/* Table header */}
                <View style={styles.tableHeader}>
                  {columns.map((col) => (
                    <Text key={col} style={styles.columnHeader}>
                      {col}
                    </Text>
                  ))}
                </View>

                {/* Table body - a plain View, not its own nested ScrollView.
                    Same fix as cash-in-hand.tsx: a vertical scroller boxed
                    to maxHeight and nested inside this horizontal
                    ScrollView, itself nested inside the page's own vertical
                    ScrollView, is 3 alternating-axis scroll containers deep
                    - breaks touch gesture routing on mobile. Every other
                    working table in the app uses the simpler 2-level
                    structure this now matches. */}
                <View>
                  {filtered.length === 0 ? (
                    <View style={styles.emptyRow}>
                      <Text style={{ color: '#aaa', fontSize: 13 }}>No records found</Text>
                    </View>
                  ) : (
                    filtered.map((entry, idx) => (
                      <View
                        key={entry.id}
                        style={[
                          styles.tableRow,
                          { backgroundColor: idx % 2 === 0 ? 'rgba(0,0,0,0.04)' : 'transparent' },
                        ]}
                      >
                        <Text style={styles.rowCell} numberOfLines={1}>{entry.date}</Text>
                        <Text style={styles.rowCell} numberOfLines={1}>{entry.chequeNo || '-'}</Text>
                        <Text style={styles.rowCell} numberOfLines={1}>{entry.description || '-'}</Text>
                        <Text style={styles.rowCell} numberOfLines={1}>
                          {entry.debit != null ? entry.debit.toFixed(2) : '-'}
                        </Text>
                        <Text style={styles.rowCell} numberOfLines={1}>
                          {entry.credit != null ? entry.credit.toFixed(2) : '-'}
                        </Text>
                        <Text style={styles.rowCell} numberOfLines={1}>{entry.runningBalance.toFixed(2)}</Text>
                        <View style={[styles.rowCell, { flexDirection: 'row', justifyContent: 'center', gap: 10 }]}>
                          <Pressable onPress={() => handleEdit(entry)} style={{ padding: 4, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 6 }}>
                            <Text style={{ fontSize: 14 }}>✏️</Text>
                          </Pressable>
                          <Pressable onPress={() => handleDelete(entry.id)} style={{ padding: 4, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 }}>
                            <Text style={{ fontSize: 14 }}>🗑️</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Summary section — inside card, below grid */}
            <View style={[styles.summarySection, { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.07)', paddingTop: Spacing.three }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text }]}>Total Debit balance</Text>
                <View style={[styles.summaryPill, { backgroundColor: theme.backgroundSelected }]}>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>
                    {totalCredit.toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text }]}>Total Credit balance</Text>
                <View style={[styles.summaryPill, { backgroundColor: theme.backgroundSelected }]}>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>
                    {totalDebit.toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text }]}>Current Bank Balance</Text>
                <View style={[styles.summaryPill, { backgroundColor: theme.backgroundSelected }]}>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>
                    {currentBalance.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Add Modal */}
      <Modal visible={addModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">{editingId ? 'Edit Entry' : 'Add Entry'}</ThemedText>
              <Pressable onPress={() => setAddModalOpen(false)}>
                <Text style={{ fontSize: 20, color: theme.text }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

              {/* Previous Month Bank Balance — editable, pre-filled */}
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Previous Month Bank Balance
                </Text>
                <TextInput
                  style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: 'transparent' }]}
                  placeholder="0.00"
                  placeholderTextColor="#aaa"
                  keyboardType="decimal-pad"
                  value={form.prevBalance}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, prevBalance: v }))}
                  editable={true}
                />
              </View>

              {/* Date — pre-filled with today (Sri Lanka), editable */}
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#aaa"
                  value={form.date}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, date: v }))}
                />
              </View>

              {/* Cheque No & Description */}
              {[
                { label: 'Cheque No', key: 'chequeNo', placeholder: 'e.g. CHQ-001', keyboard: 'default' },
                { label: 'Description', key: 'description', placeholder: 'Enter description', keyboard: 'default' },
              ].map(({ label, key, placeholder, keyboard }) => (
                <View key={key} style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
                  <TextInput
                    style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    placeholder={placeholder}
                    placeholderTextColor="#aaa"
                    value={(form as any)[key]}
                    onChangeText={(v) => setForm((prev) => ({ ...prev, [key]: v }))}
                    keyboardType={keyboard as any}
                  />
                </View>
              ))}

              {/* Transaction Type Toggle */}
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Transaction Type</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <Pressable
                    onPress={() => setTransactionType('debit')}
                    style={[
                      styles.typeToggleBtn,
                      transactionType === 'debit'
                        ? { backgroundColor: '#ef4444', borderColor: '#ef4444' }
                        : { backgroundColor: 'transparent', borderColor: '#ef4444' },
                    ]}
                  >
                    <Text style={[
                      styles.typeToggleBtnText,
                      { color: transactionType === 'debit' ? '#fff' : '#ef4444' },
                    ]}>Credit</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setTransactionType('credit')}
                    style={[
                      styles.typeToggleBtn,
                      transactionType === 'credit'
                        ? { backgroundColor: '#22c55e', borderColor: '#22c55e' }
                        : { backgroundColor: 'transparent', borderColor: '#22c55e' },
                    ]}
                  >
                    <Text style={[
                      styles.typeToggleBtnText,
                      { color: transactionType === 'credit' ? '#fff' : '#22c55e' },
                    ]}>Debit</Text>
                  </Pressable>
                </View>
              </View>

              {/* Amount input — label and border color match selected type */}
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: transactionType === 'debit' ? '#ef4444' : '#22c55e' }]}>
                  {transactionType === 'debit' ? 'Credit Amount' : 'Debit Amount'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: theme.text,
                      borderColor: transactionType === 'debit' ? '#ef4444' : '#22c55e',
                      borderWidth: 1.5,
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor="#aaa"
                  keyboardType="decimal-pad"
                  value={form.amount}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, amount: v }))}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.saveBtn, { backgroundColor: '#3b82f6' }]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>{editingId ? 'Update Entry' : 'Save Entry'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success confirmation popup */}
      <SuccessModal
        visible={successVisible}
        title="Entry Added!"
        subtitle="The new bank entry has been saved successfully."
        buttonLabel="OK"
        onClose={() => setSuccessVisible(false)}
      />
    </ThemedView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.four,
      paddingBottom: BottomTabInset,
      backgroundColor: 'transparent',
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
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
      backgroundColor: theme.backgroundElement,
    },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      flexWrap: 'wrap',
    },
    searchWrapper: {
      flex: 1,
      minWidth: 130,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.backgroundSelected,
      paddingHorizontal: Spacing.two,
      paddingVertical: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      backgroundColor: 'transparent',
    },
    searchIcon: {
      fontSize: 14,
      marginLeft: 4,
    },
    actionBtn: {
      paddingVertical: 9,
      paddingHorizontal: Spacing.three,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
    },
    sortBtn: {
      paddingVertical: 9,
      paddingHorizontal: Spacing.three,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sortBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 2,
      borderColor: theme.backgroundSelected,
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.two,
      gap: 4,
    },
    columnHeader: {
      width: 90,
      textAlign: 'center',
      fontWeight: '700',
      color: theme.text,
      fontSize: 12,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.two,
      gap: 4,
      alignItems: 'center',
    },
    rowCell: {
      width: 90,
      textAlign: 'center',
      color: theme.text,
      fontSize: 12,
    },
    emptyRow: {
      paddingVertical: Spacing.four,
      alignItems: 'center',
    },
    summarySection: {
      gap: Spacing.two,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    summaryLabel: {
      fontSize: 14,
      fontWeight: '500',
    },
    summaryPill: {
      borderRadius: 20,
      paddingHorizontal: Spacing.four,
      paddingVertical: 8,
      minWidth: 120,
      alignItems: 'center',
    },
    summaryValue: {
      fontSize: 13,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.four,
    },
    modalCard: {
      width: '100%',
      maxHeight: '85%',
      borderRadius: 28,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.three,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    modalBody: {
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.three,
    },
    modalFooter: {
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.three,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.1)',
    },
    fieldRow: {
      marginBottom: Spacing.three,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: Spacing.one,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 24,
      padding: Spacing.two,
      fontSize: 13,
      backgroundColor: 'transparent',
    },
    saveBtn: {
      borderRadius: 24,
      paddingVertical: 12,
      alignItems: 'center',
    },
    saveBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
    readonlyPill: {
      borderRadius: 24,
      paddingHorizontal: Spacing.three,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readonlyText: {
      fontSize: 14,
      fontWeight: '700',
    },
    typeToggleBtn: {
      paddingVertical: 9,
      paddingHorizontal: Spacing.four,
      borderRadius: 24,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 90,
    },
    typeToggleBtnText: {
      fontWeight: '700',
      fontSize: 14,
    },
  });
