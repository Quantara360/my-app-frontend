import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BackgroundPattern } from '@/components/BackgroundPattern';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SuccessModal } from '@/components/success-modal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE_URL } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { useGoBack } from "@/hooks/use-go-back";
import { generateAndShareVoucher, generateVoucherHtml } from '@/utils/pdfVoucher';
import * as Print from 'expo-print';

type OtherPayment = {
  id: number;
  description: string;
  data: string;
  amount: number;
  anouny: string;
  date?: string;
};

const initialFormState = {
  description: '',
  data: '',
  amount: '',
  anouny: '',
  date: '',
};

const normalizePayment = (item: any): OtherPayment => ({
  id: Number(item.id ?? 0),
  description: String(item.description ?? ''),
  data: String(item.data ?? ''),
  amount: Number(item.amount ?? 0),
  anouny: String(item.anouny ?? ''),
  date: item.date ? String(item.date) : undefined,
});

export default function OtherPaymentsPage() {
  const goBack = useGoBack();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();

  const [payments, setPayments] = useState<OtherPayment[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<OtherPayment | null>(null);
  const [formValues, setFormValues] = useState(initialFormState);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const webDateInputRef = useRef<HTMLInputElement | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedViewItem, setSelectedViewItem] = useState<OtherPayment | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoicePayee, setInvoicePayee] = useState('');
  const [invoiceVatRegNo, setInvoiceVatRegNo] = useState('');
  const [invoiceVatPaid, setInvoiceVatPaid] = useState('');

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchPayments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/other-payments`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setPayments(Array.isArray(data) ? data.map(normalizePayment) : (data.data || []).map(normalizePayment));
      } catch (error) {
        console.error(error);
      }
    };

    fetchPayments();
  }, [token]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const query = search.toLowerCase();
      return (
        payment.description.toLowerCase().includes(query) ||
        payment.data.toLowerCase().includes(query) ||
        payment.anouny.toLowerCase().includes(query)
      );
    });
  }, [payments, search]);

  const openAddPayment = () => {
    setSelectedPayment(null);
    setIsEditing(false);
    setFormValues(initialFormState);
    setPaymentDate(new Date());
    setShowDatePicker(false);
    setFormOpen(true);
  };

  const openEditPayment = (payment: OtherPayment) => {
    setSelectedPayment(payment);
    setIsEditing(true);
    setFormValues({
      description: payment.description,
      data: payment.data,
      amount: String(payment.amount),
      anouny: payment.anouny,
      date: payment.date ?? '',
    });
    setPaymentDate(payment.date ? new Date(payment.date) : new Date());
    setShowDatePicker(false);
    setFormOpen(true);
  };

  const handleSavePayment = async () => {
    if (!token) return;
    if (!formValues.description.trim()) {
      Alert.alert('Validation error', 'Description is required.');
      return;
    }
    if (!formValues.amount.trim()) {
      Alert.alert('Validation error', 'Amount is required.');
      return;
    }

    const payload = {
      description: formValues.description,
      data: formValues.data,
      amount: Number(formValues.amount),
      anouny: formValues.anouny,
      date: formValues.date || paymentDate.toISOString().split('T')[0],
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing && selectedPayment
      ? `${API_BASE_URL}/other-payments/${selectedPayment.id}`
      : `${API_BASE_URL}/other-payments`;

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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to save payment');
      }

      const actualData = data.payment || data.data || data;
      const updated = normalizePayment(actualData);
      setPayments((prev) => {
        if (isEditing && selectedPayment) {
          return prev.map((item) => (item.id === selectedPayment.id ? updated : item));
        }
        return [updated, ...prev];
      });
      setFormOpen(false);
      setSuccessMessage(isEditing ? 'Payment updated successfully!' : 'Payment added successfully!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to save payment');
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!token) return;

    const response = await fetch(`${API_BASE_URL}/other-payments/${paymentId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      Alert.alert('Delete failed', data.message || 'Unable to delete payment');
      return;
    }

    setPayments((prev) => prev.filter((payment) => payment.id !== paymentId));
    setSuccessMessage('Payment deleted successfully!');
  };

  const handleGenerateInvoice = () => {
    if (!selectedInvoiceId) return;
    const t = payments.find(tx => tx.id === selectedInvoiceId);
    if (!t) return;
    
    generateAndShareVoucher({
      id: t.id,
      date: t.date || '',
      payee: invoicePayee || '................................',
      particulars: t.description || '...',
      accountHead: t.anouny || 'expense',
      grossAmount: t.amount,
      vatRegNo: invoiceVatRegNo,
      vatPaid: parseFloat(invoiceVatPaid) || 0,
    }).then(() => {
      setInvoiceModalOpen(false);
      setInvoiceSearch('');
      setInvoicePayee('');
      setInvoiceVatRegNo('');
      setInvoiceVatPaid('');
      setSelectedInvoiceId(null);
    });
  };

  const handleViewInvoice = async () => {
    if (!selectedInvoiceId) return;
    const t = payments.find(tx => tx.id === selectedInvoiceId);
    if (!t) return;
    
    const html = generateVoucherHtml({
      id: t.id,
      date: t.date || '',
      payee: invoicePayee || '................................',
      particulars: t.description || '...',
      accountHead: t.anouny || 'expense',
      grossAmount: t.amount,
      vatRegNo: invoiceVatRegNo,
      vatPaid: parseFloat(invoiceVatPaid) || 0,
    });

    if (Platform.OS === 'web') {
      setPreviewHtml(html);
      setPreviewModalOpen(true);
      setInvoiceModalOpen(false);
    } else {
      await Print.printAsync({ html });
    }
  };

  const invoiceSearchResults = invoiceSearch.trim() === '' ? [] : payments.filter(t => 
    t.id.toString().includes(invoiceSearch.toLowerCase()) || 
    (t.description || '').toLowerCase().includes(invoiceSearch.toLowerCase())
  ).slice(0, 5);

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#F1E7DF' }]}>
      <BackgroundPattern />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]} onPress={() => goBack()}>
            <Text style={{ fontSize: 20, color: '#555', fontWeight: 'bold' }}>{'\u2190'}</Text>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>Peticash</ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.topControls}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Peticash"
              placeholderTextColor={theme.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            <Pressable style={[styles.exportButton, { backgroundColor: '#22c55e' }]} onPress={() => setInvoiceModalOpen(true)}>
              <Text style={styles.exportButtonText}>🧾 Generate Invoice</Text>
            </Pressable>
            <Pressable style={[styles.addButton, { backgroundColor: '#3b82f6' }]} onPress={openAddPayment}>
              <Text style={styles.addButtonText}>＋ Add</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "column", minWidth: 660 }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.columnHeader, { width: 30, flex: 0, minWidth: 30, textAlign: 'center' }]}>ID</Text>
                <Text style={[styles.columnHeader, { width: 100, minWidth: 100, flex: 0, textAlign: 'center' }]}>Description</Text>
                <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0, textAlign: 'center' }]}>Date</Text>
                <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0, textAlign: 'center' }]}>Amount</Text>
                <Text style={[styles.columnHeader, { width: 100, minWidth: 100, flex: 0, textAlign: 'center' }]}>Note</Text>
                <Text style={styles.columnHeaderRight}>Actions</Text>
              </View>

              <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
                {filteredPayments.map((payment) => (
                  <View key={payment.id} style={styles.tableRow}>
                    <View style={{ width: 30, minWidth: 30, maxWidth: 30, overflow: 'hidden', alignItems: 'center' }}>
                      <Text style={styles.rowCell} numberOfLines={1}>{payment.id}</Text>
                    </View>
                    <View style={{ width: 100, minWidth: 100, maxWidth: 100, overflow: 'hidden', alignItems: 'center' }}>
                      <Text style={styles.rowCell} numberOfLines={1}>{payment.description}</Text>
                    </View>
                    <View style={{ width: 120, minWidth: 120, maxWidth: 120, overflow: 'hidden', alignItems: 'center' }}>
                      <Text style={styles.rowCell} numberOfLines={1}>{payment.date}</Text>
                    </View>
                    <View style={{ width: 120, minWidth: 120, maxWidth: 120, overflow: 'hidden', alignItems: 'center' }}>
                      <Text style={styles.rowCell} numberOfLines={1}>{payment.amount}</Text>
                    </View>
                    <View style={{ width: 100, minWidth: 100, maxWidth: 100, overflow: 'hidden', alignItems: 'center' }}>
                      <Text style={styles.rowCell} numberOfLines={1}>{payment.anouny}</Text>
                    </View>
                    <View style={styles.actionsColumn}>
                      <Pressable style={styles.actionButtonIcon} onPress={() => { setSelectedViewItem(payment); setViewDetailsOpen(true); }}>
                        <Text style={styles.actionIcon}>{'\u{1F441}'}</Text>
                      </Pressable>
                      <Pressable style={styles.actionButtonIcon} onPress={() => openEditPayment(payment)}>
                        <Text style={styles.actionIcon}>{'\u270F'}</Text>
                      </Pressable>
                      <Pressable style={styles.actionButtonIconDelete} onPress={() => handleDeletePayment(payment.id)}>
                        <Text style={styles.actionIcon}>{'\u2715'}</Text>
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
                <ThemedText type="title">{isEditing ? 'Update Payment' : 'Add Other Payment'}</ThemedText>
                <Pressable onPress={() => setFormOpen(false)}>
                  <Text style={styles.closeText}>{'\u2715'}</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Description"
                  value={formValues.description}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, description: value }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Data"
                  value={formValues.data}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, data: value }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Amount"
                  keyboardType="decimal-pad"
                  value={formValues.amount}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, amount: value }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Anouny"
                  value={formValues.anouny}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, anouny: value }))}
                />

                {Platform.OS === 'web' ? (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Date</Text>
                    <Pressable style={[styles.pill, { backgroundColor: theme.background }]} onPress={() => { webDateInputRef.current?.showPicker?.(); webDateInputRef.current?.click(); }}>
                      <Text style={styles.pillText}>{formValues.date || paymentDate.toISOString().split('T')[0]}</Text>
                    </Pressable>
                    <input
                      ref={webDateInputRef}
                      type="date"
                      value={formValues.date || paymentDate.toISOString().split('T')[0]}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setFormValues((prev) => ({ ...prev, date: value }));
                        const parsedDate = new Date(value);
                        if (!Number.isNaN(parsedDate.getTime())) {
                          setPaymentDate(parsedDate);
                        }
                      }}
                      style={{ position: 'absolute', opacity: 0, width: 1, height: 1, zIndex: -1, pointerEvents: 'none' }}
                    />
                  </View>
                ) : (
                  <>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Date</Text>
                      <Pressable style={[styles.pill, { backgroundColor: theme.background }]} onPress={() => setShowDatePicker(true)}>
                        <Text style={styles.pillText}>{paymentDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                      </Pressable>
                    </View>
                    {showDatePicker && (
                      <>
                        <DateTimePicker
                          value={paymentDate}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={(_event, selectedDate) => {
                            setShowDatePicker(Platform.OS === 'ios');
                            if (selectedDate) {
                              setPaymentDate(selectedDate);
                              setFormValues((prev) => ({ ...prev, date: selectedDate.toISOString().split('T')[0] }));
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

                <Pressable style={styles.saveButton} onPress={handleSavePayment}>
                  <Text style={styles.saveText}>{isEditing ? 'Save Changes' : 'Add Payment'}</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        )}
        <Modal visible={viewDetailsOpen} transparent animationType="fade" onRequestClose={() => setViewDetailsOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title">Payment Details</ThemedText>
                <Pressable onPress={() => setViewDetailsOpen(false)}>
                  <Text style={styles.modalCloseButton}>{'\u2715'}</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody}>
                {selectedViewItem && (
                  <>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Description</ThemedText>
                      <ThemedText>{selectedViewItem.description}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Data</ThemedText>
                      <ThemedText>{selectedViewItem.data}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Amount</ThemedText>
                      <ThemedText>{selectedViewItem.amount}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="smallBold" style={styles.detailLabel}>Note</ThemedText>
                      <ThemedText>{selectedViewItem.anouny}</ThemedText>
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

        <SuccessModal visible={!!successMessage} title={successMessage ?? ''} onClose={() => setSuccessMessage(null)} />

        {/* Invoice Generator Modal */}
        <Modal visible={invoiceModalOpen} transparent animationType="fade" onRequestClose={() => setInvoiceModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement, padding: 20 }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title">Generate Invoice</ThemedText>
                <Pressable onPress={() => setInvoiceModalOpen(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <ThemedText style={{ marginBottom: 10 }}>Search by ID or Description</ThemedText>

                <TextInput
                  style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Type ID e.g. 123 or description..."
                  placeholderTextColor="#aaa"
                  value={invoiceSearch}
                  onChangeText={(v) => {
                    setInvoiceSearch(v);
                    setSelectedInvoiceId(null);
                  }}
                />

                {!selectedInvoiceId && invoiceSearch.trim() !== '' && (
                  <View style={{ maxHeight: 150, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 10, marginTop: 5 }}>
                    {invoiceSearchResults.length === 0 ? (
                      <Text style={{ padding: 10, color: '#aaa' }}>No matching records found.</Text>
                    ) : (
                      invoiceSearchResults.map(t => (
                        <Pressable
                          key={t.id}
                          style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}
                          onPress={() => {
                            setSelectedInvoiceId(t.id);
                            setInvoiceSearch(`ID: ${t.id} - ${t.description || 'No description'}`);
                          }}
                        >
                          <Text style={{ color: theme.text }}>ID: {t.id} | Rs. {t.amount} | {t.description}</Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                )}

                {selectedInvoiceId && (
                  <View style={{ marginTop: 15 }}>
                    <ThemedText style={{ marginBottom: 8 }}>Name of Payee (Optional)</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected, marginBottom: 15 }]}
                      placeholder="Enter payee name..."
                      placeholderTextColor="#aaa"
                      value={invoicePayee}
                      onChangeText={setInvoicePayee}
                    />
                    
                    <ThemedText style={{ marginBottom: 8 }}>Supplier's VAT Registration No. (Optional)</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected, marginBottom: 15 }]}
                      placeholder="Enter VAT Registration No..."
                      placeholderTextColor="#aaa"
                      value={invoiceVatRegNo}
                      onChangeText={setInvoiceVatRegNo}
                    />
                    
                    <ThemedText style={{ marginBottom: 8 }}>VAT Paid Amount (Optional)</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      placeholder="Enter VAT paid..."
                      placeholderTextColor="#aaa"
                      keyboardType="numeric"
                      value={invoiceVatPaid}
                      onChangeText={setInvoiceVatPaid}
                    />
                  </View>
                )}
              </ScrollView>

              <View style={[styles.modalFooter, { justifyContent: 'space-between' }]}>
                <Pressable style={[styles.modalButton, { backgroundColor: 'transparent' }]} onPress={() => setInvoiceModalOpen(false)}>
                  <Text style={[styles.modalButtonText, { color: '#555' }]}>Cancel</Text>
                </Pressable>
                
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable 
                    style={[styles.modalButton, { backgroundColor: selectedInvoiceId ? '#6a0dad' : '#aaa', paddingHorizontal: 15 }]} 
                    onPress={handleViewInvoice}
                    disabled={!selectedInvoiceId}
                  >
                    <Text style={styles.modalButtonText}>👁 View</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.modalButton, { backgroundColor: selectedInvoiceId ? '#1a7a3a' : '#aaa', paddingHorizontal: 15 }]} 
                    onPress={handleGenerateInvoice}
                    disabled={!selectedInvoiceId}
                  >
                    <Text style={styles.modalButtonText}>⬇ PDF</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Web Preview Modal */}
        {Platform.OS === 'web' && (
          <Modal visible={previewModalOpen} transparent animationType="fade" onRequestClose={() => setPreviewModalOpen(false)}>
            <View style={styles.overlay}>
              <View style={styles.previewBox}>
                <View style={styles.modalBar}>
                  <ThemedText type="subtitle" style={{ fontSize: 15, fontWeight: "700" }}>
                    Voucher Preview
                  </ThemedText>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      onPress={() => {
                        setPreviewModalOpen(false);
                        handleGenerateInvoice();
                      }}
                      style={styles.printBtn}
                    >
                      <Text style={styles.printBtnTxt}>⬇ PDF</Text>
                    </Pressable>
                    <Pressable onPress={() => setPreviewModalOpen(false)} style={styles.closeBtn}>
                      <Text style={styles.closeBtnTxt}>✕ Close</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
                  <iframe 
                    srcDoc={previewHtml} 
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </View>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, padding: Spacing.four, paddingBottom: BottomTabInset, backgroundColor: 'transparent' },
    safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    backButton: { padding: Spacing.two, borderRadius: 14 },
    pageTitle: { flex: 1, textAlign: 'center', color: theme.text },
    card: { borderRadius: 30, padding: Spacing.four, gap: Spacing.three, minHeight: 0, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 10, backgroundColor: theme.backgroundElement },
    topControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three, flexWrap: 'wrap' },
    addButton: { paddingVertical: 9, paddingHorizontal: Spacing.three, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    exportButton: { paddingVertical: 9, paddingHorizontal: Spacing.three, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    exportButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    searchInput: { flex: 1, minWidth: 160, padding: Spacing.two, borderRadius: 24, backgroundColor: 'transparent', color: theme.text, fontSize: 13, borderWidth: 1, borderColor: theme.backgroundSelected },
    tableHeader: { flexDirection: 'row', paddingVertical: Spacing.three, paddingHorizontal: Spacing.two, borderBottomWidth: 2, borderColor: theme.backgroundSelected, backgroundColor: 'transparent', gap: Spacing.two },
    columnHeader: {
      flex: 1,
      minWidth: 120, fontWeight: '700', color: theme.text, fontSize: 13, textAlign: 'center'
    },
    columnHeaderRight: {
      width: 110,
      flex: 0,
      textAlign: 'center',
      fontWeight: '700',
      color: theme.text,
      fontSize: 13,
    },
    tableBody: { marginTop: Spacing.two, maxHeight: 420 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.two, paddingHorizontal: Spacing.two, borderBottomWidth: 1, borderColor: theme.backgroundSelected, gap: Spacing.two },
    rowCell: {
      color: theme.text, fontSize: 13, textAlign: 'center', overflow: 'hidden',
    },
    actionsColumn: {
      width: 110,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      flex: 0,
      marginLeft: 24,
    },
    actionButtonIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
    actionButtonIconDelete: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
    actionIcon: { color: '#fff', fontWeight: '700', fontSize: 12 },
    formOverlay: { position: Platform.OS === 'web' ? 'fixed' : 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
    formCard: { width: '100%', maxHeight: '85%', borderRadius: 28, backgroundColor: theme.backgroundElement, padding: Spacing.four, gap: Spacing.three },
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    closeText: { fontSize: 20, color: theme.text },
    formBody: { gap: Spacing.two },
    fieldRow: { gap: Spacing.one },
    fieldLabel: { fontSize: 13, color: theme.text, fontWeight: '700', marginBottom: Spacing.one },
    textInput: { width: '100%', padding: Spacing.two, borderRadius: 24, backgroundColor: 'transparent', color: theme.text, fontSize: 13, marginTop: Spacing.one, borderWidth: 1, borderColor: theme.backgroundSelected },
    pill: { borderRadius: 24, paddingVertical: Spacing.two, paddingHorizontal: Spacing.four, minWidth: 140, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.backgroundSelected },
    pillText: { color: theme.text, fontSize: 13 },
    saveButton: { marginTop: Spacing.three, padding: Spacing.three, borderRadius: 24, backgroundColor: '#0f172a', alignItems: 'center' },
    saveText: { color: '#fff', fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { borderRadius: 16, width: '90%', maxHeight: '80%', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.1)' },
    modalCloseButton: { fontSize: 24, fontWeight: 'bold' },
    modalBody: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
    modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, marginTop: 24 },
    modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
    modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: 1, borderColor: theme.backgroundSelected },
    detailLabel: { color: theme.textSecondary },
    overlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "center", alignItems: "center", padding: 12,
    },
    previewBox: {
      backgroundColor: theme.backgroundElement,
      borderRadius: 16, padding: 16,
      width: '90%', maxWidth: 900,
      height: '90%',
    },
    modalBar: {
      flexDirection: "row", justifyContent: "space-between",
      alignItems: "center", marginBottom: 12,
    },
    printBtn: { backgroundColor: "#1a7a3a", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, justifyContent: 'center' },
    printBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "600" },
    closeBtn: { backgroundColor: "#e5e5ea", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, justifyContent: 'center' },
    closeBtnTxt: { color: "#333", fontSize: 13, fontWeight: "600" },
  });
