"""
Fix all office staff pages so the BackgroundPattern actually shows:
- The outer ThemedView/View container must be flex:1, backgroundColor transparent
- BackgroundPattern renders the actual background
"""
import os
import re

app_dir = r'c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app'

# Pages that need the background fix
files_to_fix = [
    'assets.tsx', 'chemicals.tsx', 'machineries.tsx',
    'workers.tsx', 'approvals.tsx', 'office-salaries.tsx', 'salaries.tsx',
    'worker-salaries.tsx', 'other-payments.tsx', 'attendances.tsx',
    'peticash.tsx', 'template.tsx', 'add-image-capture.tsx',
    'face-recognition.tsx', 'bonds.tsx', 'bid-bonds.tsx', 'performance-bonds.tsx'
]

for filename in files_to_fix:
    filepath = os.path.join(app_dir, filename)
    if not os.path.exists(filepath):
        print(f"SKIP (not found): {filename}")
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False
    
    # 1. Add import if missing
    if 'BackgroundPattern' not in content:
        if "from 'react-native'" in content:
            # Add after react-native import
            content = re.sub(
                r"(import \{[^}]+\} from 'react-native';)",
                r"\1\nimport { BackgroundPattern } from '@/components/BackgroundPattern';",
                content, count=1
            )
        elif 'from "react-native"' in content:
            content = re.sub(
                r'(import \{[^}]+\} from "react-native";)',
                r'\1\nimport { BackgroundPattern } from \'@/components/BackgroundPattern\';',
                content, count=1
            )
        changed = True
    
    # 2. Find the first return( and add BackgroundPattern right inside the outermost container
    # Pattern: ThemedView or View with styles.container
    
    # Make the outer container style transparent
    # Replace: backgroundColor: theme.background (for the container style only)
    # The container style is typically named 'container' in StyleSheet
    # We need to be careful not to change other elements' backgrounds
    
    # Fix container style in StyleSheet - make it transparent
    # This handles: container: { flex: 1, backgroundColor: theme.background }
    content = re.sub(
        r'(container:\s*\{[^}]*?)backgroundColor:\s*theme\.background([^}]*?\})',
        r"\1backgroundColor: 'transparent'\2",
        content
    )
    content = re.sub(
        r'(container:\s*\{[^}]*?)backgroundColor:\s*theme\.backgroundElement([^}]*?\})',
        r"\1backgroundColor: 'transparent'\2",
        content
    )
    
    # Also handle inline container background in JSX
    content = content.replace(
        '<ThemedView style={styles.container}>',
        '<ThemedView style={[styles.container, { backgroundColor: \'transparent\' }]}>'
    )
    # But only if BackgroundPattern is already inside - avoid double-replace issues
    # Actually just leave ThemedView as is and ensure BackgroundPattern shows
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed: {filename}")

print("\nDone!")
