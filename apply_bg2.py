import os
import re

app_dir = r'c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app'

files_to_check = [
    'assets.tsx', 'chemicals.tsx', 'machineries.tsx'
]

for filename in files_to_check:
    filepath = os.path.join(app_dir, filename)
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if 'BackgroundPattern' in content:
        continue
        
    # Import BackgroundPattern
    if 'import { ThemedText }' in content:
        content = content.replace("import { ThemedText }", "import { BackgroundPattern } from '@/components/BackgroundPattern';\nimport { ThemedText }")
    elif 'import { ThemedView }' in content:
        content = content.replace("import { ThemedView }", "import { BackgroundPattern } from '@/components/BackgroundPattern';\nimport { ThemedView }")
    else:
        # Just put it after react imports
        content = content.replace("import React", "import { BackgroundPattern } from '@/components/BackgroundPattern';\nimport React")
        
    # Insert BackgroundPattern
    # Find something like `<SafeAreaView style={styles.safeArea}>` or `<View style={styles.container}>`
    if '<SafeAreaView style={styles.safeArea}>' in content:
        content = content.replace("<SafeAreaView style={styles.safeArea}>", "<BackgroundPattern />\n      <SafeAreaView style={styles.safeArea}>")
    elif '<SafeAreaView' in content:
        content = re.sub(r'(<SafeAreaView[^>]*>)', r'<BackgroundPattern />\n      \1', content, count=1)
    
    # Change container background to transparent
    content = content.replace("backgroundColor: theme.background },", "backgroundColor: 'transparent' },")
    content = content.replace("backgroundColor: theme.background\n  },", "backgroundColor: 'transparent'\n  },")
    content = content.replace("backgroundColor: theme.background,", "backgroundColor: 'transparent',")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filename}")
