import re

content = open('C:/xampp1/htdocs/MyFirstProject (1)/MyFirstProject/src/app/admin.tsx', 'r', encoding='utf-8').read()

# Apply card text colors
content = re.sub(r'<ThemedText type="smallBold" style=\{styles\.cardTitle\}>\s*\{card\.title\}\s*</ThemedText>', 
                 '<ThemedText type="smallBold" style={[styles.cardTitle, { color: card.textColor }]}>\n                    {card.title}\n                  </ThemedText>', content)

content = re.sub(r'<Text style=\{styles\.cardValue\}>\{card\.value\}</Text>', 
                 '<Text style={[styles.cardValue, { color: card.textColor }]}>{card.value}</Text>', content)

content = re.sub(r'<ThemedText type="smallBold" style=\{styles\.fullWidthCardTitle\}>\s*Peticash & Accounts\s*</ThemedText>', 
                 '<ThemedText type="smallBold" style={[styles.fullWidthCardTitle, { color: "#1f1d21" }]}>\n                  Peticash & Accounts\n                </ThemedText>', content)

# Fix background colors that were missed
content = content.replace('backgroundColor: "#fff"', 'backgroundColor: isDark ? "#1e1e1e" : "#fff"')
content = content.replace('backgroundColor: "#f2f2f6"', 'backgroundColor: isDark ? "#333333" : "#f2f2f6"')

# Fix siteDropdownText color to be more visible
content = content.replace('color: isDark ? "#aaaaaa" : "#666",', 'color: isDark ? "#e0e0e0" : "#666",')

# Fix placeholder colors on inputs. They are passed as props.
content = content.replace('placeholderTextColor="#8a8a8f"', 'placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}')
content = content.replace('placeholderTextColor="#999"', 'placeholderTextColor={isDark ? "#b0b0b0" : "#999"}')

open('C:/xampp1/htdocs/MyFirstProject (1)/MyFirstProject/src/app/admin.tsx', 'w', encoding='utf-8').write(content)
print('Text and colors fixed.')
