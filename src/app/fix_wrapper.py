import os
import re

directory = r"c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app"

files = [
    "workers.tsx",
    "worker-salaries.tsx",
    "peticash.tsx",
    "other-payments.tsx",
    "office-salaries.tsx",
    "machineries.tsx",
    "chemicals.tsx",
    "assets.tsx",
    "approvals.tsx"
]

for file in files:
    filepath = os.path.join(directory, file)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace <View style={{ minWidth: 800 }}> or similar with 1400
    content = re.sub(
        r'<View style=\{\{\s*minWidth:\s*\d+\s*\}\}>',
        r'<View style={{ minWidth: 1400 }}>',
        content
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
