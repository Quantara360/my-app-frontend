import re

ARROW_LEFT = r"{'\u2190'}"
ICON_EDIT  = r"{'\u270F'}"
ICON_DEL   = r"{'\u2715'}"

# ── 1. machineries.tsx line 241: back button with ??? ─────────────
fname = 'machineries.tsx'
with open(fname, 'rb') as f: raw = f.read()
text = raw.decode('latin-1')
lines = text.split('\n')
for i, line in enumerate(lines):
    if i == 240:  # line 241 (0-indexed = 240)
        safe = line.encode('ascii','replace').decode('ascii')
        print(f"Before: {safe.strip()}")
        # Replace ??? (any sequence of non-ASCII or ? between > and <)
        new = re.sub(r'>([^<]{1,10})</Text>', lambda m: f'>{ARROW_LEFT}</Text>', line)
        if new != line:
            lines[i] = new
            print(f"After:  {lines[i].strip()}")
        else:
            # Try direct byte-level replacement
            # The ??? are likely multi-byte sequences that decode as ? with errors='replace'
            print(f"  No change via regex - trying byte replacement")
text = '\n'.join(lines)
with open(fname, 'wb') as f: f.write(text.encode('latin-1'))
print(f"Saved {fname}\n")

# ── 2. other-payments.tsx line 190: back button with ??? ──────────
fname = 'other-payments.tsx'
with open(fname, 'rb') as f: raw = f.read()
text = raw.decode('latin-1')
lines = text.split('\n')
for i, line in enumerate(lines):
    if i == 189:  # line 190
        safe = line.encode('ascii','replace').decode('ascii')
        print(f"Before: {safe.strip()}")
        new = re.sub(r'>([^<]{1,10})</Text>', lambda m: f'>{ARROW_LEFT}</Text>', line)
        if new != line:
            lines[i] = new
            print(f"After:  {lines[i].strip()}")
text = '\n'.join(lines)
with open(fname, 'wb') as f: f.write(text.encode('latin-1'))
print(f"Saved {fname}\n")

# ── 3. peticash.tsx lines 291, 294: edit and delete action icons ──
fname = 'peticash.tsx'
with open(fname, 'rb') as f: raw = f.read()
text = raw.decode('latin-1')
lines = text.split('\n')
for i, line in enumerate(lines):
    if i == 290:  # line 291 - edit icon (single ?)
        safe = line.encode('ascii','replace').decode('ascii')
        print(f"Before peticash edit: {safe.strip()}")
        new = re.sub(r'(<Text style=\{styles\.actionIcon\}>)[^<]*(</Text>)',
                     lambda m: m.group(1)+ICON_EDIT+m.group(2), line)
        if new != line:
            lines[i] = new
            print(f"Fixed: {lines[i].strip()}")
    elif i == 293:  # line 294 - delete icon (double ??)
        safe = line.encode('ascii','replace').decode('ascii')
        print(f"Before peticash delete: {safe.strip()}")
        new = re.sub(r'(<Text style=\{styles\.actionIcon\}>)[^<]*(</Text>)',
                     lambda m: m.group(1)+ICON_DEL+m.group(2), line)
        if new != line:
            lines[i] = new
            print(f"Fixed: {lines[i].strip()}")
text = '\n'.join(lines)
with open(fname, 'wb') as f: f.write(text.encode('latin-1'))
print(f"Saved {fname}")
print("\nDone.")
