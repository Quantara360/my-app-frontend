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

    # Remove useColorScheme from react-native imports
    content = re.sub(r'import\s+\{([^}]*)\}\s+from\s+[\'"]react-native[\'"];', lambda m: m.group(0).replace('useColorScheme,', '').replace(', useColorScheme', '').replace('useColorScheme', ''), content)
    
    # Add proper import
    if 'import { useColorScheme }' not in content and 'import { useColorScheme' not in content:
        content = 'import { useColorScheme } from "@/hooks/use-color-scheme";\n' + content
    else:
        # replace import from react-native with hook if needed
        content = content.replace('import { useColorScheme } from "react-native";', 'import { useColorScheme } from "@/hooks/use-color-scheme";')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done fixing hook import")
