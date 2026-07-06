import os
import re

files = [
    'src/app/dashboard/index.tsx',
    'src/app/dashboard/select-hospitals.tsx',
    'src/app/dashboard/select-sites.tsx',
    'src/app/dashboard/[worksite].tsx',
    'src/app/mark-attendance.tsx',
    'src/app/add-image.tsx',
    'src/app/add-image-capture.tsx',
    'src/app/dashboard/site-actions.tsx'
]

circle_jsx = '''
      <View style={[styles.background, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]} />
      <View style={[styles.backgroundCircleLarge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.65)" }]} />
      <View style={[styles.backgroundCircleSmall, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255, 255, 255, 0.5)" }]} />
'''

circle_styles = '''
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundCircleLarge: {
    position: "absolute",
    width: Platform.select({ web: 280, default: 420 }),
    height: Platform.select({ web: 280, default: 420 }),
    borderRadius: Platform.select({ web: 140, default: 210 }),
    top: -160,
    right: -90,
  },
  backgroundCircleSmall: {
    position: "absolute",
    width: Platform.select({ web: 180, default: 260 }),
    height: Platform.select({ web: 180, default: 260 }),
    borderRadius: Platform.select({ web: 90, default: 130 }),
    bottom: -100,
    left: -80,
  },
'''

for file in files:
    path = os.path.join(r'c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject', file)
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Inject background JSX if not site-actions
    if 'site-actions.tsx' not in file:
        # Find first container that returns
        if 'styles.backgroundCircleLarge' not in content:
            # We assume it starts with `<ThemedView style={styles.container}>` or `<View style={styles.container}>`
            # Need to inject after the opening tag
            content = re.sub(r'(<(?:Themed)?View[^>]*style=\{styles\.container\}[^>]*>)', r'\g<1>' + circle_jsx, content, count=1)
            
            # Make sure isDark is defined if we use it
            if 'const isDark' not in content:
                # Add it after useTheme
                content = re.sub(r'(const theme = useTheme\(\);)', r'\g<1>\n  const colorScheme = useColorScheme();\n  const isDark = colorScheme === "dark";', content)
                
            # Make sure useColorScheme is imported from react-native or hook
            if 'useColorScheme' not in content:
                content = content.replace('import { useTheme } from', 'import { useColorScheme } from "react-native";\nimport { useTheme } from')
                
        # 2. Inject styles
        if 'backgroundCircleLarge:' not in content:
            # Inject after container: {
            content = re.sub(r'(container:\s*\{[^}]*\},)', r'\g<1>' + circle_styles, content)

    # 3. Add marginLeft: 15 to menuButton
    if 'menuButton:' in content:
        if 'marginLeft: 15' not in content:
            content = re.sub(r'(menuButton:\s*\{)', r'\g<1>\n    marginLeft: 15,', content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done")
