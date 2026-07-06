import os
import re

files = [
    'src/app/dashboard/index.tsx',
    'src/app/dashboard/select-hospitals.tsx',
    'src/app/dashboard/select-sites.tsx',
    'src/app/dashboard/[worksite].tsx',
    'src/app/add-image.tsx',
    'src/app/add-image-capture.tsx',
    'src/app/mark-attendance.tsx',
    'src/app/dashboard/site-actions.tsx'
]

for file in files:
    path = os.path.join(r'c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject', file)
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find react-native import
    rn_import = re.search(r'import\s+\{([^}]*)\}\s+from\s+[\'"]react-native[\'"];', content)
    if rn_import:
        imports = [x.strip() for x in rn_import.group(1).split(',')]
        if 'Platform' not in imports:
            imports.append('Platform')
        if 'useColorScheme' not in imports:
            imports.append('useColorScheme')
        
        new_import = f"import {{ {', '.join(filter(None, imports))} }} from 'react-native';"
        content = content[:rn_import.start()] + new_import + content[rn_import.end():]
    else:
        # Add a new one
        content = "import { Platform, useColorScheme } from 'react-native';\n" + content

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done imports")
