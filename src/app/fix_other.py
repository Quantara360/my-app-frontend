import os
import re

filepath = r"c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app\other-payments.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Add horizontal scroll view wrap to the table
# The table starts at: <View style={styles.tableHeader}>
# We need to wrap that and <ScrollView style={styles.tableBody} ...> ... </ScrollView> in:
# <ScrollView horizontal showsHorizontalScrollIndicator={false}>
#   <View style={{ minWidth: 800 }}>
#     ...
#   </View>
# </ScrollView>

# Find table start
content = re.sub(
    r'(<View style=\{styles\.tableHeader\}>)',
    r'<ScrollView horizontal showsHorizontalScrollIndicator={false}>\n            <View style={{ minWidth: 800 }}>\n              \1',
    content
)

# Find table end, which is the closing </ScrollView> of tableBody
# It looks like:
#           </ScrollView>
#         </View>
#         {formOpen && (
# We need to add closing tags for our wrapper before the </View> that closes the card

content = re.sub(
    r'(</ScrollView>\s*</View>\s*\{formOpen)',
    r'</ScrollView>\n            </View>\n          </ScrollView>\n        </View>\n\n        {formOpen',
    content
)

# Replace widths
content = re.sub(
    r'columnHeader:\s*\{\s*flex:\s*1,',
    r'columnHeader: {\n      flex: 1,\n      minWidth: 120,',
    content
)

def rowcell_replacer(match):
    inner = match.group(1)
    inner = re.sub(r'maxWidth:\s*\d+,?', '', inner)
    return 'rowCell: {\n      flex: 1,\n      minWidth: 120,' + inner

content = re.sub(
    r'rowCell:\s*\{\s*flex:\s*1,(.*?)\},',
    rowcell_replacer,
    content,
    flags=re.DOTALL
)

# Fix syntax if broken (because we added }, we need to add the missing }, like fix_syntax.py)
content = re.sub(
    r'(rowCell:\s*\{[^\}]*?)(^\s*[a-zA-Z0-9]+:\s*\{)',
    r'\1    },\n\2',
    content,
    flags=re.MULTILINE | re.DOTALL
)

# Fix actions
content = re.sub(
    r'columnHeaderRight:\s*\{[^}]*\}',
    r"columnHeaderRight: {\n    minWidth: 120,\n    textAlign: 'center',\n    fontWeight: '700',\n    color: theme.text,\n    fontSize: 13,\n  }",
    content
)

content = re.sub(
    r'actionsColumn:\s*\{[^}]*\}',
    r"actionsColumn: {\n    minWidth: 120,\n    flexDirection: 'row',\n    justifyContent: 'center',\n    gap: Spacing.one,\n  }",
    content
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
