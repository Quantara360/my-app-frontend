files = [
    "assets.tsx",
    "approvals.tsx",
    "peticash.tsx",
]

old_text = '<ThemedText type="smallBold">?</ThemedText>'
# Use JS unicode escape \u2190 so the source file stays in the original encoding
new_text = "<Text style={{ fontSize: 20, color: '#555', fontWeight: 'bold' }}>{'\\u2190'}</Text>"

encodings_to_try = ['utf-8', 'latin-1', 'cp1252', 'utf-16']

for filename in files:
    content = None
    used_encoding = None
    for enc in encodings_to_try:
        try:
            with open(filename, 'r', encoding=enc) as f:
                content = f.read()
            used_encoding = enc
            break
        except Exception:
            continue
    
    if content is None:
        print(f"  ERROR: Could not read {filename} with any encoding")
        continue

    if old_text in content:
        back_pressable_idx = content.find('styles.backButton')
        if back_pressable_idx == -1:
            print(f"  WARNING: Could not find backButton in {filename}")
            continue
        question_idx = content.find(old_text, back_pressable_idx)
        if question_idx == -1:
            print(f"  WARNING: Could not find ? text after backButton in {filename}")
            continue
        content = content[:question_idx] + new_text + content[question_idx + len(old_text):]
        with open(filename, 'w', encoding=used_encoding) as f:
            f.write(content)
        print(f"  FIXED: {filename} (encoding: {used_encoding})")
    else:
        print(f"  SKIP: {filename} - pattern not found")

print("Done.")
