import re

content = open('C:/xampp1/htdocs/MyFirstProject (1)/MyFirstProject/src/app/admin.tsx', 'r', encoding='utf-8').read()

pattern = r'<View style=\{\[styles\.headerSection, styles\.greetingContainer\]\}>\s*<ThemedText type=\"subtitle\" style=\{styles\.greeting\}>\s*Hii .*?, Welcome!\s*</ThemedText>\s*</View>'

replacement = '''<View style={[styles.headerSection, styles.greetingContainer, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <ThemedText type=\"subtitle\" style={styles.greeting}>
            Hii {user?.name || \"Malith\"}, Welcome!
          </ThemedText>
          <Pressable onPress={signOut} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isDark ? '#333' : '#e0e0e0', borderRadius: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#fff' : '#000' }}>Sign Out</Text>
          </Pressable>
        </View>'''

content = re.sub(pattern, replacement, content)
open('C:/xampp1/htdocs/MyFirstProject (1)/MyFirstProject/src/app/admin.tsx', 'w', encoding='utf-8').write(content)
print('Sign out added.')
