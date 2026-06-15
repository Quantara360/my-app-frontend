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

    # Find the fieldRow that contains a PickerOpen
    # <View style={styles.fieldRow}>
    #   <Text ...
    #   <Pressable ... onPress={() => setXPickerOpen...}
    # ...
    # {XPickerOpen && (
    #   <View style={styles.siteOptions}> (or statusOptions, etc)

    # We will just replace <View style={styles.fieldRow}> if the next lines contain sitePickerOpen or statusPickerOpen or workerPickerOpen
    
    # Actually, a better way is to dynamically replace <View style={styles.fieldRow}> to <View style={[styles.fieldRow, { zIndex: XPickerOpen ? 100 : 1 }]}>
    # And <View style={styles.siteOptions}> to <View style={[styles.siteOptions, { position: 'absolute', top: 75, left: 0, right: 0, zIndex: 100 }]}>

    # Replace <View style={styles.siteOptions}>
    content = re.sub(r'<View style=\{styles\.siteOptions\}>', r"<View style={[styles.siteOptions, { position: 'absolute', top: 75, left: 0, right: 0, zIndex: 100 }]}>", content)
    
    # Replace <View style={styles.statusOptions}>
    # Be careful: assets.tsx has statusOptions without position absolute!
    content = re.sub(r'<View style=\{styles\.statusOptions\}>', r"<View style={[styles.statusOptions, { position: 'absolute', top: 75, left: 0, right: 0, zIndex: 100 }]}>", content)

    # Wait, in some places like workers.tsx, there's workerPickerOpen or similar? 
    # workerPickerOpen uses styles.siteOptions or similar?
    # Let's check what styles workerPicker uses. Probably siteOptions.
    
    # Now, we need to fix the fieldRow zIndex.
    # It's hard to regex the exact fieldRow that contains the picker because there are multiple fieldRows.
    # What if we just add { zIndex: 100 } to the fieldRow inline? But then multiple fieldRows with 100 might stack in default order.
    # That's why we need `zIndex: sitePickerOpen ? 100 : 1`.
    
    # Let's use a regex to capture the Picker variable name:
    # <View style={styles.fieldRow}>\s*(?:<[^>]+>\s*)*<Pressable[^>]+set([A-Za-z]+)PickerOpen
    # No, that's too complex. Let's just find the exact occurrences.

    # We can just change all `fieldRow` to have `zIndex` based on any picker being open.
    # Or just write a function to fix the text.

    lines = content.split('\n')
    for i, line in enumerate(lines):
        if '<View style={styles.fieldRow}>' in line:
            # Look ahead to see if there's a PickerOpen
            picker_name = None
            for j in range(i+1, min(i+15, len(lines))):
                m = re.search(r'\{([a-zA-Z]+PickerOpen) &&', lines[j])
                if m:
                    picker_name = m.group(1)
                    break
            
            if picker_name:
                lines[i] = line.replace('<View style={styles.fieldRow}>', f'<View style={{[styles.fieldRow, {{ zIndex: {picker_name} ? 100 : 1 }}]}}>')
    
    content = '\n'.join(lines)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
