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
  const [selectedViewItem, setSelectedViewItem] = useState<PeticashTransaction | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoicePayee, setInvoicePayee] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);"""
    
    content = content.replace(
        "  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);\n  const [selectedViewItem, setSelectedViewItem] = useState<PeticashTransaction | null>(null);",
        state_injection
    )

    # 3. Add handleGenerateInvoice function
    handle_gen = """  const handleGenerateInvoice = () => {
    if (!selectedInvoiceId) return;
    const t = transactions.find(tx => tx.id === selectedInvoiceId);
    if (!t) return;
    
    generateAndShareVoucher({
      id: t.id,
      date: t.transaction_date,
      payee: invoicePayee || t.worksite?.name || '................................',
      particulars: t.description || '...',
      accountHead: t.type,
      grossAmount: t.amount,
    }).then(() => {
      setInvoiceModalOpen(false);
      setInvoiceSearch('');
      setInvoicePayee('');
      setSelectedInvoiceId(null);
    });
  };

  const invoiceSearchResults = invoiceSearch.trim() === '' ? [] : transactions.filter(t => 
    t.id.toString().includes(invoiceSearch.toLowerCase()) || 
    (t.description || '').toLowerCase().includes(invoiceSearch.toLowerCase())
  ).slice(0, 5);"""
    
    # insert before the return statement
    if "const handleGenerateInvoice" not in content:
        content = content.replace("  return (\n    <ThemedView", f"{handle_gen}\n\n  return (\n    <ThemedView")

    # 4. Add Generate Invoice Button
    add_btn_str = """            {!isAdmin && (
              <Pressable style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]} onPress={openAddTransaction}>
                <ThemedText type="smallBold">+ Add</ThemedText>
              </Pressable>
            )}"""
    
    new_add_btn_str = """            {!isAdmin && (
              <Pressable style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]} onPress={openAddTransaction}>
                <ThemedText type="smallBold">+ Add</ThemedText>
              </Pressable>
            )}
            <Pressable style={[styles.addButton, { backgroundColor: '#22c55e', marginLeft: 10 }]} onPress={() => setInvoiceModalOpen(true)}>
              <ThemedText type="smallBold" style={{color: '#fff'}}>📄 Generate Invoice</ThemedText>
            </Pressable>"""
    
    content = content.replace(add_btn_str, new_add_btn_str)

    # 5. Add Modal HTML at the end of the return
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
    
    content = content.replace("""        <SuccessModal
          visible={!!successMessage}
          title={successMessage ?? ''}
          onClose={() => setSuccessMessage(null)}
        />""", modal_html)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Processed {filepath}")

process_file('src/app/peticash.tsx')
