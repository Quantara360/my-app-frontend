import re

def process_file(filepath, is_bank):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add imports for update and delete
    if is_bank:
        content = content.replace(
            "import { getBankEntries, createBankEntry } from '@/services/accountsService';",
            "import { getBankEntries, createBankEntry, updateBankEntry, deleteBankEntry } from '@/services/accountsService';"
        )
        api_create = 'createBankEntry'
        api_update = 'updateBankEntry'
        api_delete = 'deleteBankEntry'
    else:
        content = content.replace(
            "import { getCashInHandEntries, createCashInHandEntry } from '@/services/accountsService';",
            "import { getCashInHandEntries, createCashInHandEntry, updateCashInHandEntry, deleteCashInHandEntry } from '@/services/accountsService';"
        )
        api_create = 'createCashInHandEntry'
        api_update = 'updateCashInHandEntry'
        api_delete = 'deleteCashInHandEntry'

    # 2. Add editingId state
    state_injection = """  const [transactionType, setTransactionType] = useState<'debit' | 'credit'>('debit');
  const [editingId, setEditingId] = useState<number | null>(null);"""
    content = content.replace(
        "  const [transactionType, setTransactionType] = useState<'debit' | 'credit'>('debit');",
        state_injection
    )

    # 3. Swap UI text (Debit <-> Credit)
    content = content.replace("columns = ['Date', 'Cheque No', 'Description', 'Debit', 'Credit', 'Balance'];", "columns = ['Date', 'Cheque No', 'Description', 'Credit', 'Debit', 'Balance', 'Actions'];")
    content = content.replace("Total Debit balance", "TEMP_DBT_BAL")
    content = content.replace("Total Credit balance", "Total Debit balance")
    content = content.replace("TEMP_DBT_BAL", "Total Credit balance")
    
    content = content.replace("'Debit Amount' : 'Credit Amount'", "'Credit Amount' : 'Debit Amount'")
    
    # Swap the label texts in the transaction type toggle
    content = content.replace(">{transactionType === 'debit' ? '#fff' : '#ef4444' },\n                    ]}>Debit</Text>", ">{transactionType === 'debit' ? '#fff' : '#ef4444' },\n                    ]}>Credit</Text>")
    content = content.replace(">{transactionType === 'credit' ? '#fff' : '#22c55e' },\n                    ]}>Credit</Text>", ">{transactionType === 'credit' ? '#fff' : '#22c55e' },\n                    ]}>Debit</Text>")

    # 4. Modify handleAdd to handle Save/Edit
    handle_add_match = re.search(r"  const handleAdd = \(\) => \{.*?\n  \};\n", content, re.DOTALL)
    if handle_add_match:
        old_handle_add = handle_add_match.group(0)
        
        new_handle_add = f"""  const handleSave = () => {{
    if (!form.date) {{ Alert.alert('Validation', 'Date is required.'); return; }}
    const debit  = transactionType === 'debit'  && form.amount ? parseFloat(form.amount) : null;
    const credit = transactionType === 'credit' && form.amount ? parseFloat(form.amount) : null;
    const prevBalance = parseFloat(form.prevBalance || '0');
    const newBalance = prevBalance + (credit ?? 0) - (debit ?? 0);
    
    if (editingId) {{
      setEntries((prev) => prev.map((e) => e.id === editingId ? {{ ...e, date: form.date, chequeNo: form.chequeNo, description: form.description, debit, credit, balance: newBalance }} : e));
      {api_update}(editingId, {{
        date:        form.date,
        cheque_no:   form.chequeNo || null,
        description: form.description || null,
        debit:       debit,
        credit:      credit,
        balance:     newBalance,
      }}).catch((err) => console.warn('update error', err));
    }} else {{
      const entry = {{
        id: Date.now(),
        date: form.date,
        chequeNo: form.chequeNo,
        description: form.description,
        debit,
        credit,
        balance: newBalance,
      }};
      setEntries((prev) => [...prev, entry]);
      {api_create}({{
        date:        entry.date,
        cheque_no:   entry.chequeNo || null,
        description: entry.description || null,
        debit:       entry.debit,
        credit:      entry.credit,
        balance:     entry.balance,
      }}).catch((err) => console.warn('save error', err));
    }}
    
    setForm({{ date: getSriLankaDate(), chequeNo: '', description: '', amount: '', prevBalance: prevMonthBalance.toFixed(2) }});
    setTransactionType('debit');
    setEditingId(null);
    setAddModalOpen(false);
    setSuccessVisible(true);
  }};

  const handleEdit = (entry: any) => {{
    setEditingId(entry.id);
    setForm({{
      date: entry.date,
      chequeNo: entry.chequeNo || '',
      description: entry.description || '',
      amount: (entry.debit || entry.credit || '').toString(),
      prevBalance: prevMonthBalance.toFixed(2),
    }});
    setTransactionType(entry.debit != null ? 'debit' : 'credit');
    setAddModalOpen(true);
  }};

  const handleDelete = (id: number) => {{
    Alert.alert('Delete', 'Are you sure you want to delete this entry?', [
      {{ text: 'Cancel', style: 'cancel' }},
      {{ text: 'Delete', style: 'destructive', onPress: () => {{
        setEntries((prev) => prev.filter((e) => e.id !== id));
        {api_delete}(id).catch(err => console.warn('delete error', err));
      }} }}
    ]);
  }};
"""
        content = content.replace(old_handle_add, new_handle_add)

    # 5. Fix onPress for Save Entry button
    content = content.replace("onPress={handleAdd}", "onPress={handleSave}")

    # 6. Add Add button reset logic
    content = content.replace(
        "setForm((prev) => ({ ...prev, prevBalance: prevMonthBalance.toFixed(2) }));\n                setAddModalOpen(true);",
        "setEditingId(null);\n                setForm({ date: getSriLankaDate(), chequeNo: '', description: '', amount: '', prevBalance: prevMonthBalance.toFixed(2) });\n                setAddModalOpen(true);"
    )

    # 7. Update table row to include Actions column
    row_block = """                      <Text style={styles.rowCell} numberOfLines={1}>{entry.balance.toFixed(2)}</Text>
                    </View>"""
    new_row_block = """                      <Text style={styles.rowCell} numberOfLines={1}>{entry.balance.toFixed(2)}</Text>
                      <View style={[styles.rowCell, { flexDirection: 'row', justifyContent: 'center', gap: 10 }]}>
                        <Pressable onPress={() => handleEdit(entry)} style={{ padding: 4, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 6 }}>
                          <Text style={{ fontSize: 14 }}>✏️</Text>
                        </Pressable>
                        <Pressable onPress={() => handleDelete(entry.id)} style={{ padding: 4, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 }}>
                          <Text style={{ fontSize: 14 }}>🗑️</Text>
                        </Pressable>
                      </View>
                    </View>"""
    content = content.replace(row_block, new_row_block)

    # 8. Add modal header dynamic text
    content = content.replace("<ThemedText type=\"title\">Add Entry</ThemedText>", "<ThemedText type=\"title\">{editingId ? 'Edit Entry' : 'Add Entry'}</ThemedText>")
    content = content.replace("<Text style={styles.saveBtnText}>Save Entry</Text>", "<Text style={styles.saveBtnText}>{editingId ? 'Update Entry' : 'Save Entry'}</Text>")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Processed {filepath}")

process_file('src/app/cash-in-hand.tsx', False)
process_file('src/app/bank.tsx', True)
