with open('other-payments.tsx', 'rb') as f:
    raw = f.read()
text = raw.decode('latin-1')

# Fix ID column header: add flex:0 so it doesn't expand
old_id_hdr = '<Text style={[styles.columnHeader, { width: 30 }]}>ID</Text>'
new_id_hdr = '<Text style={[styles.columnHeader, { width: 30, flex: 0, minWidth: 30 }]}>ID</Text>'

# Fix ID row cell: add flex:0 so it doesn't expand
old_id_cell = '<Text style={[styles.rowCell, { width: 30 }]} numberOfLines={1}>{payment.id}</Text>'
new_id_cell = '<Text style={[styles.rowCell, { width: 30, flex: 0, minWidth: 30 }]} numberOfLines={1}>{payment.id}</Text>'

changed = 0
if old_id_hdr in text:
    text = text.replace(old_id_hdr, new_id_hdr)
    changed += 1
    print("Fixed ID column header: added flex:0")
else:
    print("WARNING: ID header pattern not found")

if old_id_cell in text:
    text = text.replace(old_id_cell, new_id_cell)
    changed += 1
    print("Fixed ID row cell: added flex:0")
else:
    print("WARNING: ID row cell pattern not found")

if changed > 0:
    with open('other-payments.tsx', 'wb') as f:
        f.write(text.encode('latin-1'))
    print(f"\nSaved {changed} changes.")
else:
    print("\nNo changes saved.")
