import re
import os

target_file = r'c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app\performance-bonds.tsx'
with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'import DateTimePicker' not in content:
    content = content.replace("import {\n", "import DateTimePicker from '@react-native-community/datetimepicker';\nimport {\n")
if 'BackgroundPattern' not in content:
    content = content.replace("import { ThemedText }", "import { BackgroundPattern } from '@/components/BackgroundPattern';\nimport { ThemedText }")

# Add datepicker state and ref
if 'const [showDatePicker' not in content:
    content = content.replace("const [statusPickerOpen, setStatusPickerOpen] = useState(false);",
"""const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const webDateInputRef = React.useRef<HTMLInputElement | null>(null);""")

# Update openAdd
content = content.replace("setFormValues({ ...initialForm });",
"""setFormValues({ ...initialForm });
    setSelectedDate(new Date());
    setShowDatePicker(false);""")

# Update openEdit
content = content.replace("setFormValues({",
"""const parsedDate = b.date ? new Date(b.date) : new Date();
    setSelectedDate(parsedDate);
    setShowDatePicker(false);
    setFormValues({""")

# Update handleSave
content = content.replace("date: formValues.date,",
"date: formValues.date || selectedDate.toISOString().split('T')[0],")

# Add BackgroundPattern
content = content.replace("<SafeAreaView style={styles.safeArea}>", "<BackgroundPattern />\n      <SafeAreaView style={styles.safeArea}>")

# Fix Date Picker in JSX
date_input_jsx = """<Text style={[styles.label, { color: theme.textSecondary }]}>Date</Text>
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
                    )}
                  </>
                )}"""
content = re.sub(
    r"<Text style=\{\[styles\.label, \{ color: theme\.textSecondary \}\]\}>Date</Text>\s*<TextInput.*?date: v \}\)\)} />",
    date_input_jsx,
    content,
    flags=re.DOTALL
)

# Fix Container Background
content = content.replace("backgroundColor: theme.background },", "backgroundColor: 'transparent' },")

# Fix styles
content = content.replace(
"""  columnHeader: { flex: 1, fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' },
  columnHeaderRight: { width: 110, fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', textAlign: 'right' },
  tableBody: { maxHeight: 400 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: Spacing.two, borderBottomWidth: 1, borderBottomColor: theme.backgroundSelected, alignItems: 'center' },
  rowCell: { flex: 1, fontSize: 13, color: theme.text },""",
"""  columnHeader: { flex: 1, minWidth: 100, fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' },
  columnHeaderRight: { width: 110, minWidth: 110, fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', textAlign: 'right' },
  tableBody: { maxHeight: 400 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: Spacing.two, borderBottomWidth: 1, borderBottomColor: theme.backgroundSelected, alignItems: 'center', gap: Spacing.one },
  rowCell: { flex: 1, minWidth: 100, fontSize: 13, color: theme.text },"""
)
# Update widths to include flex: 0 and minWidth to stop overlapping flex: 1
content = re.sub(r"\{ width: (\d+) \}", r"{ width: \1, minWidth: \1, flex: 0 }", content)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated performance-bonds.tsx")
