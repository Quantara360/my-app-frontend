with open('other-payments.tsx', 'rb') as f:
    raw = f.read()
text = raw.decode('latin-1')
lines = text.split('\n')

# Step 1: Remove width: 580 from the inner wrapper (let content drive scroll size)
for i, line in enumerate(lines):
    if '<View style={{ width: 580 }}>' in line:
        lines[i] = line.replace('<View style={{ width: 580 }}>', '<View style={{ flexDirection: "column" }}>', 1)
        print(f"Fixed line {i+1}: {lines[i].strip()}")
        break

# Step 2: Give actionsColumn explicit width:90 + flex:0 so it never gets squeezed
old_actions_style = """    actionsColumn: {\r
    minWidth: 90,\r
    flexDirection: 'row',\r
    justifyContent: 'center',\r
    gap: 4,\r
  },"""

new_actions_style = """    actionsColumn: {\r
    width: 90,\r
    flexDirection: 'row',\r
    justifyContent: 'center',\r
    alignItems: 'center',\r
    gap: 4,\r
    flex: 0,\r
  },"""

text = '\n'.join(lines)
if old_actions_style in text:
    text = text.replace(old_actions_style, new_actions_style)
    print("Fixed actionsColumn style: width:90 + flex:0")
else:
    print("actionsColumn style not found, trying inline...")
    import re
    text = re.sub(
        r"(actionsColumn:\s*\{)[^}]*(minWidth:\s*90)",
        lambda m: m.group(0).replace('minWidth: 90', 'width: 90').replace('minWidth:90', 'width: 90'),
        text
    )

# Step 3: columnHeaderRight also needs to match (width:90, flex:0)
old_chr = """    columnHeaderRight: {\r
    minWidth: 90,\r
    textAlign: 'center',\r
    fontWeight: '700',\r
    color: theme.text,\r
    fontSize: 13,\r
  },"""
new_chr = """    columnHeaderRight: {\r
    width: 90,\r
    flex: 0,\r
    textAlign: 'center',\r
    fontWeight: '700',\r
    color: theme.text,\r
    fontSize: 13,\r
  },"""

if old_chr in text:
    text = text.replace(old_chr, new_chr)
    print("Fixed columnHeaderRight: width:90 + flex:0")
else:
    print("columnHeaderRight not matched (may already be OK)")

with open('other-payments.tsx', 'wb') as f:
    f.write(text.encode('latin-1'))
print("\nSaved successfully.")
