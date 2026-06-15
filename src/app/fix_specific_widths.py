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
    "approvals.tsx",
    "other-payments.tsx"
]

COLUMN_WIDTHS = {
    "Quantity": 100,
    "Count": 80,
    "Site": 120,
    "Hazard": 100,
    "Value": 120,
    "Type": 120,
    "Role": 120,
    "Age": 60,
    "Date": 120,
    "Amount": 120,
    "Status": 120,
    "Machine": 150,
    "Due": 120,
    "Salary": 120,
    "Worker": 150,
    "NIC": 150,
    "Storage": 150,
    "Note": 150
}

for filename in files:
    filepath = os.path.join(directory, filename)
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    table_block_match = re.search(r'(<View style=\{styles\.tableHeader\}>[\s\S]*?)(?:<\/ScrollView>|<\/View>\s*<\/ScrollView>)', content)
    if not table_block_match:
        continue
        
    table_block = table_block_match.group(1)
    
    lines = table_block.split('\n')
    header_indices = {}
    
    idx = 0
    for line in lines:
        if 'styles.columnHeader' in line or 'styles.columnHeaderRight' in line:
            m = re.search(r'>([^<]+)<\/Text>', line)
            if m:
                col_name = m.group(1).strip()
                if col_name in COLUMN_WIDTHS:
                    header_indices[idx] = COLUMN_WIDTHS[col_name]
            idx += 1
            
    new_lines = []
    h_idx = 0
    r_idx = 0
    in_header = False
    in_row = False
    
    for line in lines:
        if 'styles.tableHeader' in line:
            in_header = True
            
        if in_header and ('styles.columnHeader' in line or 'styles.columnHeaderRight' in line):
            if h_idx in header_indices:
                w = header_indices[h_idx]
                if 'style={styles.columnHeader}' in line:
                    line = line.replace('style={styles.columnHeader}', f'style={{[styles.columnHeader, {{ width: {w}, minWidth: {w}, flex: 0 }}]}}')
                elif 'style={styles.columnHeaderRight}' in line:
                    line = line.replace('style={styles.columnHeaderRight}', f'style={{[styles.columnHeaderRight, {{ width: {w}, minWidth: {w}, flex: 0 }}]}}')
            h_idx += 1
        
        if 'actionsColumn' in line or 'columnHeaderRight' in line or '>Actions<' in line:
            in_header = False
            
        if 'styles.tableRow' in line:
            in_row = True
            r_idx = 0
            
        if in_row and ('styles.rowCell' in line or 'actionsColumn' in line):
            if 'actionsColumn' in line:
                in_row = False
            else:
                if r_idx in header_indices:
                    w = header_indices[r_idx]
                    if 'style={styles.rowCell}' in line:
                        line = line.replace('style={styles.rowCell}', f'style={{[styles.rowCell, {{ width: {w}, minWidth: {w}, flex: 0 }}]}}')
                r_idx += 1
                
        new_lines.append(line)
        
    new_table_block = '\n'.join(new_lines)
    content = content.replace(table_block, new_table_block)
    
    # Let's also fix the minWidth: 1400 wrapper to minWidth: '100%' so the table isn't artificially stretched
    content = re.sub(
        r'<View style=\{\{\s*minWidth:\s*1400\s*\}\}>',
        r'<View style={{ minWidth: \'100%\' }}>',
        content
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("Updated specific column widths and table wrapper.")
