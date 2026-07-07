import re

target_file = r'c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app\dashboard\index.tsx'
with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Change Other Payments to Payments
content = content.replace('title: "Other Payments"', 'title: "Payments"')

# Change staffCard to check if it's "Bonds" and set flexBasis to 100%
if '{officeStaffTiles.map((tile) => (' in content:
    # We need to conditionally style the card.
    # The current code is:
    # styles.staffCard,
    # {
    #   backgroundColor: theme.background,
    #   borderColor: theme.backgroundSelected,
    # },
    # pressed && styles.staffCardPressed,
    
    # We can replace styles.staffCard with an array that includes a conditional width
    replacement = """styles.staffCard,
                      tile.id === "bonds" ? { flexBasis: "100%", maxWidth: "100%" } : {},"""
    content = content.replace("styles.staffCard,", replacement)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated dashboard/index.tsx")
