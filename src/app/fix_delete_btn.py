with open('other-payments.tsx', 'rb') as f:
    raw = f.read()
text = raw.decode('latin-1')

# 1. Increase actionsColumn from width:90 to width:110 so all 3 buttons render
old_act = """    actionsColumn: {\r
    width: 90,\r
    flexDirection: 'row',\r
    justifyContent: 'center',\r
    alignItems: 'center',\r
    gap: 4,\r
    flex: 0,\r
  },"""

new_act = """    actionsColumn: {\r
    width: 110,\r
    flexDirection: 'row',\r
    justifyContent: 'center',\r
    alignItems: 'center',\r
    gap: 6,\r
    flex: 0,\r
  },"""

# 2. Update columnHeaderRight to match
old_chr = """    columnHeaderRight: {\r
    width: 90,\r
    flex: 0,\r
    textAlign: 'center',\r
    fontWeight: '700',\r
    color: theme.text,\r
    fontSize: 13,\r
  },"""

new_chr = """    columnHeaderRight: {\r
    width: 110,\r
    flex: 0,\r
    textAlign: 'center',\r
    fontWeight: '700',\r
    color: theme.text,\r
    fontSize: 13,\r
  },"""

changed = 0
if old_act in text:
    text = text.replace(old_act, new_act)
    changed += 1
    print("actionsColumn: 90 -> 110, gap: 4 -> 6")
else:
    print("WARNING: actionsColumn pattern not found")

if old_chr in text:
    text = text.replace(old_chr, new_chr)
    changed += 1
    print("columnHeaderRight: 90 -> 110")
else:
    print("WARNING: columnHeaderRight pattern not found")

if changed > 0:
    with open('other-payments.tsx', 'wb') as f:
        f.write(text.encode('latin-1'))
    print(f"\nSaved {changed} changes.")
else:
    print("\nNo changes saved.")
