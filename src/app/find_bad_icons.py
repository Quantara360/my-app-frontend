import os
import re

app_dir = r'c:\Users\ACER\Desktop\mobileapp\frontend\src\app'

files = ['office-salaries.tsx', 'machineries.tsx', 'approvals.tsx', 'peticash.tsx', 'other-payments.tsx']

for fname in files:
    fpath = os.path.join(app_dir, fname)
    with open(fpath, 'rb') as f:
        raw = f.read()
    text = raw.decode('latin-1')
    lines = text.split('\n')
    
    print(f"\n=== {fname} ===")
    for i, line in enumerate(lines, 1):
        # Find any line with a Text component that has suspicious content (non-ascii, or ?)
        if '<Text' in line or '<ThemedText' in line:
            # Check for any non-ASCII in the line
            has_non_ascii = any(ord(c) > 127 for c in line)
            has_question = '>?' in line or '?<' in line
            if has_non_ascii or has_question:
                safe = line.encode('ascii', errors='replace').decode('ascii')
                print(f"  {i}: {safe.strip()}")
