with open('other-payments.tsx', 'rb') as f:
    raw = f.read()
text = raw.decode('latin-1')

# THE ROOT CAUSE:
# - Description column uses styles.columnHeader which has flex:1, minWidth:120
# - This causes Description to expand and push Actions off-screen
# - Fix: give Description a fixed width (100px), remove flex from it
# - Fix: give tableHeader and tableRow a fixed total width so the ScrollView scrolls properly

# 1. Fix Description column HEADER - add explicit width, remove flex expansion
old_desc_header = "<Text style={styles.columnHeader}>Description</Text>"
new_desc_header = "<Text style={[styles.columnHeader, { width: 100, minWidth: 100, flex: 0 }]}>Description</Text>"

# 2. Fix Description column ROW CELL - add explicit width, remove flex expansion
old_desc_cell = "<Text style={styles.rowCell} numberOfLines={1}>{payment.description}</Text>"
new_desc_cell = "<Text style={[styles.rowCell, { width: 100, minWidth: 100, flex: 0 }]} numberOfLines={1}>{payment.description}</Text>"

# 3. Wrap the inner View with a fixed total width so horizontal scroll works
# Total: ID(30) + gap + Desc(100) + gap + Date(120) + gap + Amount(120) + gap + Note(100) + gap + Actions(90) + extra padding
# = 30 + 100 + 120 + 120 + 100 + 90 + 5gaps(8*5=40) = 600px - use 580 to be safe
old_wrapper = "<View>\n              <View style={styles.tableHeader}>"
new_wrapper = "<View style={{ width: 580 }}>\n              <View style={styles.tableHeader}>"

changed = 0

if old_desc_header in text:
    text = text.replace(old_desc_header, new_desc_header)
    changed += 1
    print("Fixed Description column header")
else:
    print("WARNING: Description header pattern not found")

if old_desc_cell in text:
    text = text.replace(old_desc_cell, new_desc_cell)
    changed += 1
    print("Fixed Description row cell")
else:
    print("WARNING: Description row cell pattern not found")

if old_wrapper in text:
    text = text.replace(old_wrapper, new_wrapper)
    changed += 1
    print("Fixed inner View width to 580px")
else:
    print("WARNING: inner View wrapper pattern not found")

if changed > 0:
    with open('other-payments.tsx', 'wb') as f:
        f.write(text.encode('latin-1'))
    print(f"\nSaved with {changed} fixes.")
else:
    print("\nNo changes saved.")
