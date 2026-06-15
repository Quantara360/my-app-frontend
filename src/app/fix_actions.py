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

    # Modify columnHeaderRight
    # Replace anything inside columnHeaderRight: { ... }
    # r'columnHeaderRight:\s*\{[^}]*\}'
    
    # We want to keep the same text style but change width/alignment
    content = re.sub(
        r'columnHeaderRight:\s*\{[^}]*\}',
        r"columnHeaderRight: {\n    minWidth: 120,\n    textAlign: 'center',\n    fontWeight: '700',\n    color: theme.text,\n    fontSize: 13,\n  }",
        content
    )
    
    # Modify actionsColumn
    content = re.sub(
        r'actionsColumn:\s*\{[^}]*\}',
        r"actionsColumn: {\n    minWidth: 120,\n    flexDirection: 'row',\n    justifyContent: 'center',\n    gap: Spacing.one,\n  }",
        content
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
