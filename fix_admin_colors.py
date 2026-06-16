import re

file_path = 'src/app/admin.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove hardcoded backgroundColor from tableCard and personalTableCard
content = re.sub(r'(tableCard:\s*\{[^}]*?)backgroundColor:\s*"#ffffff",\s*', r'\1', content)
content = re.sub(r'(personalTableCard:\s*\{[^}]*?)backgroundColor:\s*"#ffffff",\s*', r'\1', content)

# 2. Add backgroundColor: theme.backgroundElement to usages
content = content.replace('<View style={styles.tableCard}>', '<View style={[styles.tableCard, { backgroundColor: theme.backgroundElement }]}>')
content = content.replace('<View style={[styles.tableCard, { minWidth: 600 }]}>', '<View style={[styles.tableCard, { minWidth: 600, backgroundColor: theme.backgroundElement }]}>')
content = content.replace('<View style={styles.personalTableCard}>', '<View style={[styles.personalTableCard, { backgroundColor: theme.backgroundElement }]}>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
