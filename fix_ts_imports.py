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

    # Add Platform to react-native imports if not present
    if 'Platform' not in content[:1000]: # Look in top imports
        content = re.sub(r'import\s+\{[^}]*\}\s+from\s+[\'"]react-native[\'"];', lambda m: m.group(0).replace('import {', 'import { Platform,') if 'Platform' not in m.group(0) else m.group(0), content)

    # Add useColorScheme to react-native imports if not present
    if 'useColorScheme' not in content[:1000]:
        content = re.sub(r'import\s+\{[^}]*\}\s+from\s+[\'"]react-native[\'"];', lambda m: m.group(0).replace('import {', 'import { useColorScheme,') if 'useColorScheme' not in m.group(0) else m.group(0), content)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done")
