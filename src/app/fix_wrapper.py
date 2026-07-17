with open('other-payments.tsx', 'rb') as f:
    raw = f.read()
text = raw.decode('latin-1')

# Find the exact inner wrapper line and fix it
import re

# The inner View (inside horizontal ScrollView) needs a fixed width
# so the ScrollView knows the full scroll extent
# Replace <View> (bare, no style) that is inside the horizontal ScrollView
# with <View style={{ width: 580 }}>
# We know from inspection it's at line 210: <View>

# Use line-by-line to find the exact bare <View> inside the horizontal scroll
lines = text.split('\n')
in_hscroll = False
fixed = False
for i, line in enumerate(lines):
    if 'ScrollView horizontal' in line:
        in_hscroll = True
    if in_hscroll and not fixed:
        stripped = line.strip()
        if stripped == '<View>':
            lines[i] = line.replace('<View>', '<View style={{ width: 580 }}>', 1)
            fixed = True
            print(f"Fixed line {i+1}: {lines[i].strip()}")
            break

if not fixed:
    print("Bare <View> not found inside horizontal ScrollView - checking alternatives...")
    for i, line in enumerate(lines):
        safe = line.encode('ascii', errors='replace').decode('ascii')
        if 205 <= i+1 <= 215:
            print(f"  {i+1}: {safe}")

if fixed:
    result = '\n'.join(lines)
    with open('other-payments.tsx', 'wb') as f:
        f.write(result.encode('latin-1'))
    print("Saved.")
