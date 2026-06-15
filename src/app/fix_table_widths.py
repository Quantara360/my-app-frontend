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

    # Modify columnHeader:
    content = re.sub(
        r'columnHeader:\s*\{\s*flex:\s*1,',
        r'columnHeader: {\n      flex: 1,\n      minWidth: 120,',
        content
    )
    
    # Modify rowCell: we also want to remove maxWidth if it's there
    def rowcell_replacer(match):
        inner = match.group(1)
        # Remove maxWidth: \d+, from inner
        inner = re.sub(r'maxWidth:\s*\d+,?', '', inner)
        return 'rowCell: {\n      flex: 1,\n      minWidth: 120,' + inner

    content = re.sub(
        r'rowCell:\s*\{\s*flex:\s*1,(.*?)\},',
        rowcell_replacer,
        content,
        flags=re.DOTALL
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
