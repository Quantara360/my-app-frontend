import re

# Icons as JS unicode escapes (ASCII-safe, works in React Native)
ICON_VIEW    = r"{'\u{1F441}'}"   # 👁 eye  
ICON_EDIT    = r"{'\u270F'}"      # ✏ pencil
ICON_DELETE  = r"{'\u2715'}"      # ✕ cross
ICON_APPROVE = r"{'\u2713'}"      # ✓ checkmark

encodings_to_try = ['utf-8', 'latin-1', 'cp1252']

def fix_action_icons_in_file(fname, replacements):
    """
    replacements: list of (search_line_fragment, new_icon) tuples.
    Finds a Pressable line containing search_line_fragment,
    then replaces the content of the <Text style={styles.actionIcon}> on the NEXT line.
    """
    with open(fname, 'rb') as f:
        raw = f.read()

    # Decode losslessly with latin-1
    text = raw.decode('latin-1')
    lines = text.split('\n')

    changed = 0
    i = 0
    while i < len(lines):
        line = lines[i]
        for (search_fragment, new_icon) in replacements:
            if search_fragment in line and 'Pressable' in line:
                # Look at next line for actionIcon
                if i + 1 < len(lines) and 'actionIcon' in lines[i+1]:
                    old_line = lines[i+1]
                    # Use lambda to avoid regex escape issues with \u
                    new_line = re.sub(
                        r'(<Text style=\{styles\.actionIcon\}>)[^<]*(</Text>)',
                        lambda m, icon=new_icon: m.group(1) + icon + m.group(2),
                        old_line
                    )
                    if new_line != old_line:
                        lines[i+1] = new_line
                        changed += 1
                        print(f"  Line {i+2}: {new_line.strip()}")
                break
        i += 1

    if changed > 0:
        result = '\n'.join(lines)
        with open(fname, 'wb') as f:
            f.write(result.encode('latin-1'))
        print(f"FIXED: {fname} - {changed} icons replaced\n")
    else:
        print(f"NO CHANGES: {fname}\n")


# ── machineries.tsx ──────────────────────────────────────────────
fix_action_icons_in_file('machineries.tsx', [
    ('setViewDetailsOpen(true)',      ICON_VIEW),
    ('openEditMachinery(machinery)',  ICON_EDIT),
    ('handleDeleteMachinery(',        ICON_DELETE),
])

# ── other-payments.tsx ───────────────────────────────────────────
fix_action_icons_in_file('other-payments.tsx', [
    ('setViewDetailsOpen(true)',  ICON_VIEW),
    ('openEditPayment(payment)',  ICON_EDIT),
    ('handleDeletePayment(',      ICON_DELETE),
])

# ── approvals.tsx ────────────────────────────────────────────────
fix_action_icons_in_file('approvals.tsx', [
    ('openEditApproval(a)',    ICON_APPROVE),
    ('handleDeleteApproval(', ICON_DELETE),
])

# ── office-salaries.tsx ──────────────────────────────────────────
fix_action_icons_in_file('office-salaries.tsx', [
    ('setViewDetailsOpen(true)',  ICON_VIEW),
    ('openEditSalary(salary)',    ICON_EDIT),
    ('handleDeleteSalary(',       ICON_DELETE),
])

print("All done.")
