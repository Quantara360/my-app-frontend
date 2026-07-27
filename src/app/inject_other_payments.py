import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add imports for the PDF voucher generator
    if "import { generateAndShareVoucher" not in content:
        content = content.replace(
            "import { useGoBack } from \"@/hooks/use-go-back\";",
            "import { useGoBack } from \"@/hooks/use-go-back\";\nimport { generateAndShareVoucher } from '@/utils/pdfVoucher';"
        )

    # 2. Add State variables
    state_injection = """  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedViewItem, setSelectedViewItem] = useState<OtherPayment | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoicePayee, setInvoicePayee] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);"""
    
    content = content.replace(
        "  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);\n  const [selectedViewItem, setSelectedViewItem] = useState<OtherPayment | null>(null);",
        state_injection
    )

    # 3. Add handleGenerateInvoice function
    handle_gen = """  const handleGenerateInvoice = () => {
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
    }).then(() => {
      setInvoiceModalOpen(false);
      setInvoiceSearch('');
      setInvoicePayee('');
      setSelectedInvoiceId(null);
    });
  };

  const invoiceSearchResults = invoiceSearch.trim() === '' ? [] : payments.filter(t => 
    t.id.toString().includes(invoiceSearch.toLowerCase()) || 
    (t.description || '').toLowerCase().includes(invoiceSearch.toLowerCase())
  ).slice(0, 5);"""
    
    # insert before the return statement
    if "const handleGenerateInvoice" not in content:
        content = content.replace("  return (\n    <ThemedView", f"{handle_gen}\n\n  return (\n    <ThemedView")

    # 4. Replace Generate Invoice Button with onPress
    btn_search = """            <Pressable style={[styles.exportButton, { backgroundColor: '#22c55e' }]}>
              <Text style={styles.exportButtonText}>🧾 Generate Invoice</Text>
            </Pressable>"""
    
    btn_replace = """            <Pressable style={[styles.exportButton, { backgroundColor: '#22c55e', zIndex: 50, elevation: 50 }]} onPress={() => setInvoiceModalOpen(true)}>
              <Text style={styles.exportButtonText}>🧾 Generate Invoice</Text>
            </Pressable>"""
    
    content = content.replace(btn_search, btn_replace)

    # 5. Fix Save wrapper parsing
    save_search = """      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to save payment');
      }

      const updated = normalizePayment(data);"""
      
    save_replace = """      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to save payment');
      }

      const actualData = data.payment || data.data || data;
      const updated = normalizePayment(actualData);"""
      
    content = content.replace(save_search, save_replace)

    # 6. Add Modal HTML at the end of the return
    modal_html = """        <SuccessModal
          visible={!!successMessage}
          title={successMessage ?? ''}
          onClose={() => setSuccessMessage(null)}
        />

        {/* Invoice Generator Modal */}
        <Modal visible={invoiceModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="title" style={styles.modalTitle}>Generate Invoice</ThemedText>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <ThemedText style={{marginBottom: 10}}>Search by ID or Description</ThemedText>
                
                <TextInput
                  style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Type ID e.g. 123"
                  placeholderTextColor="#aaa"
                  value={invoiceSearch}
                  onChangeText={(v) => {
                    setInvoiceSearch(v);
                    setSelectedInvoiceId(null);
                  }}
                />

                {!selectedInvoiceId && invoiceSearch.trim() !== '' && (
                  <View style={{maxHeight: 150, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 10, marginTop: 5}}>
                    {invoiceSearchResults.map(t => (
                      <Pressable 
                        key={t.id} 
                        style={{padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)'}}
                        onPress={() => {
                          setSelectedInvoiceId(t.id);
                          setInvoiceSearch(`ID: ${t.id} - ${t.description || 'No description'}`);
                        }}
                      >
                        <Text style={{color: theme.text}}>ID: {t.id} | {t.amount} | {t.description}</Text>
                      </Pressable>
                    ))}
                    {invoiceSearchResults.length === 0 && (
                      <Text style={{padding: 10, color: '#aaa'}}>No matching records found.</Text>
                    )}
                  </View>
                )}

                {selectedInvoiceId && (
                  <View style={{marginTop: 15}}>
                    <ThemedText style={{marginBottom: 10}}>Payee Name (Optional)</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      placeholder="Enter payee name manually"
                      placeholderTextColor="#aaa"
                      value={invoicePayee}
                      onChangeText={setInvoicePayee}
                    />
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <Pressable style={[styles.modalButton, { backgroundColor: 'transparent' }]} onPress={() => setInvoiceModalOpen(false)}>
                  <Text style={[styles.modalButtonText, { color: '#555' }]}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={[styles.modalButton, { backgroundColor: selectedInvoiceId ? '#22c55e' : '#aaa' }]} 
                  onPress={handleGenerateInvoice}
                  disabled={!selectedInvoiceId}
                >
                  <Text style={styles.modalButtonText}>Generate PDF</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>"""
    
    if "Invoice Generator Modal" not in content:
        content = content.replace("""        <SuccessModal
          visible={!!successMessage}
          title={successMessage ?? ''}
          onClose={() => setSuccessMessage(null)}
        />""", modal_html)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Processed {filepath}")

process_file('src/app/other-payments.tsx')
