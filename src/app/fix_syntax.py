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
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # The broken rowCell looks like:
    # rowCell: {
    #       flex: 1,
    #       minWidth: 120,
    #       color: theme.text,
    #       fontSize: 13,
    #       
    #     
    #     actionsColumn: {
    
    # We just need to add a `},` before `actionsColumn: {` or whichever style follows it.
    # We can do this by regexing `(rowCell:\s*\{[^}]*?)(^\s*[a-zA-Z0-9]+:\s*\{)` with multiline
    
    content = re.sub(
        r'(rowCell:\s*\{[^\}]*?)(^\s*[a-zA-Z0-9]+:\s*\{)',
        r'\1    },\n\2',
        content,
        flags=re.MULTILINE | re.DOTALL
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
