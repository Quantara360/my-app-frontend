import os
import re

directory = r"c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app"

files = [
    "workers.tsx",
    "worker-salaries.tsx",
    "peticash.tsx",
    "office-salaries.tsx",
    "machineries.tsx",
    "chemicals.tsx",
    "assets.tsx",
    "approvals.tsx"
]

for file in files:
    filepath = os.path.join(directory, file)
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    content = re.sub(
        r'\[styles\.columnHeader,\s*\{\s*width:\s*(\d+)\s*\}\]',
        r'[styles.columnHeader, { width: 60, minWidth: 60, flex: 0 }]',
        content
    )
    
    content = re.sub(
        r'\[styles\.rowCell,\s*\{\s*width:\s*(\d+)\s*\}\]',
        r'[styles.rowCell, { width: 60, minWidth: 60, flex: 0 }]',
        content
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("Fixed ID column widths in all files")
