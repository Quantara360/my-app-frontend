import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
  const [form, setForm] = useState({
    date: getSriLankaDate(),
    chequeNo: '',
    description: '',
    amount: '',
    prevBalance: '0.00',
  });

  const filtered = entries
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

  const totalDebit = entries.reduce((s, e) => s + (e.debit ?? 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit ?? 0), 0);
  const currentBalance = totalCredit - totalDebit;

  /** Balance of all entries whose date falls in the previous calendar month */
  const prevMonthBalance = (() => {
    const now = new Date();
    const offset = 330;
    const local = new Date(now.getTime() + offset * 60 * 1000);
    const year = local.getUTCFullYear();
    const month = local.getUTCMonth();
    const prevMonthStart = new Date(Date.UTC(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, 1));
    const prevMonthEnd = new Date(Date.UTC(year, month, 1));
    let bal = 0;
    entries.forEach((e) => {
      const d = new Date(e.date);
      if (d >= prevMonthStart && d < prevMonthEnd) {
        bal += (e.credit ?? 0) - (e.debit ?? 0);
      }
    });
    return bal;
  })();

  const handleAdd = () => {
    if (!form.date) { Alert.alert('Validation', 'Date is required.'); return; }
    const debit  = transactionType === 'debit'  && form.amount ? parseFloat(form.amount) : null;
    const credit = transactionType === 'credit' && form.amount ? parseFloat(form.amount) : null;
    const prevBalance = parseFloat(form.prevBalance || '0');
    const newBalance = prevBalance + (credit ?? 0) - (debit ?? 0);
    const entry: BankEntry = {
      id: Date.now(),
      date: form.date,
      chequeNo: form.chequeNo,
      description: form.description,
      debit,
      credit,
      balance: newBalance,
    };
    setEntries((prev) => [...prev, entry]);
    setForm({ date: getSriLankaDate(), chequeNo: '', description: '', amount: '', prevBalance: prevMonthBalance.toFixed(2) });
    setTransactionType('debit');
    setAddModalOpen(false);
    setSuccessVisible(true);
  };

  const columns = ['Date', 'Cheque No', 'Description', 'Debit', 'Credit', 'Balance'];

  return (
    <ThemedView style={[styles.container, { backgroundColor: 'transparent' }]}>
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
              <Pressable style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}>
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

                {/* Table body */}
                <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false} nestedScrollEnabled>
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
                        <Text style={styles.rowCell} numberOfLines={1}>{entry.balance.toFixed(2)}</Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </ScrollView>

            {/* Summary section — inside card, below grid */}
            <View style={[styles.summarySection, { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.07)', paddingTop: Spacing.three }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text }]}>Total Debit balance</Text>
                <View style={[styles.summaryPill, { backgroundColor: theme.backgroundSelected }]}>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>
                    {totalDebit.toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text }]}>Total Credit balance</Text>
                <View style={[styles.summaryPill, { backgroundColor: theme.backgroundSelected }]}>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>
                    {totalCredit.toFixed(2)}
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
              <ThemedText type="title">Add Entry</ThemedText>
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
                  style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="0.00"
                  placeholderTextColor="#aaa"
                  keyboardType="decimal-pad"
                  value={form.prevBalance}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, prevBalance: v }))}
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
                    ]}>Debit</Text>
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
                    ]}>Credit</Text>
                  </Pressable>
                </View>
              </View>

              {/* Amount input — label and border color match selected type */}
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: transactionType === 'debit' ? '#ef4444' : '#22c55e' }]}>
                  {transactionType === 'debit' ? 'Debit Amount' : 'Credit Amount'}
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
                onPress={handleAdd}
              >
                <Text style={styles.saveBtnText}>Save Entry</Text>
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
    tableBody: {
      maxHeight: 300,
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
