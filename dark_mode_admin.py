import re

content = open('C:/xampp1/htdocs/MyFirstProject (1)/MyFirstProject/src/app/admin.tsx', 'r', encoding='utf-8').read()

match = re.search(r'const styles = StyleSheet\.create\(\{([\s\S]+)\}\);', content)
if not match:
    print('Styles not found')
    exit()

styles_body = match.group(1)

def replace_color(m):
    prop = m.group(1)
    val = m.group(2).lower()
    
    # Text colors
    if prop == 'color':
        if val in ["'#1f1d21'", '"#1f1d21"', "'#333'", '"#333"', "'#000'", '"#000"']:
            return f'color: isDark ? "#ffffff" : {val}'
        if val in ["'#666'", '"#666"', "'#8a8a8f'", '"#8a8a8f"', "'#888'", '"#888"']:
            return f'color: isDark ? "#aaaaaa" : {val}'
    
    # Background colors
    if prop == 'backgroundColor':
        if val in ["'#f5f5f5'", '"#f5f5f5"']:
            return f'backgroundColor: isDark ? "#121212" : {val}'
        if val in ["'#ffffff'", '"#ffffff"', "'white'", '"white"']:
            return f'backgroundColor: isDark ? "#1e1e1e" : {val}'
        if val in ["'#f9fafb'", '"#f9fafb"']:
            return f'backgroundColor: isDark ? "#2a2a2a" : {val}'
        if val in ["'#e0e0e0'", '"#e0e0e0"']:
            return f'backgroundColor: isDark ? "#333333" : {val}'
    
    # Border colors
    if prop in ['borderColor', 'borderBottomColor']:
        if val in ["'#e5e7eb'", '"#e5e7eb"', "'#eaeaea'", '"#eaeaea"', "'#ccc'", '"#ccc"']:
            return f'{prop}: isDark ? "#333333" : {val}'

    return m.group(0)

new_styles_body = re.sub(r'([a-zA-Z]+):\s*([\'"][^\'"]+[\'"])', replace_color, styles_body)

new_styles_decl = 'const createStyles = (isDark: boolean) => StyleSheet.create({' + new_styles_body + '});'

content = content.replace(match.group(0), new_styles_decl)

if "const router = useRouter();" in content:
    content = content.replace("const router = useRouter();", '''const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = React.useMemo(() => createStyles(isDark), [isDark]);''')

if "useColorScheme" not in content:
    content = content.replace('import { useTheme }', 'import { useColorScheme } from "react-native";\nimport { useTheme }')

open('C:/xampp1/htdocs/MyFirstProject (1)/MyFirstProject/src/app/admin.tsx', 'w', encoding='utf-8').write(content)
print('Styles updated for dark mode.')
