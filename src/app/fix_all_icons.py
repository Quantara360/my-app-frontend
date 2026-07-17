import os
import re

app_dir = r'c:\Users\ACER\Desktop\mobileapp\frontend\src\app'

ARROW_LEFT = r"{'\u2190'}"  # ← back arrow
CLOSE_X    = r"{'\u2715'}"  # ✕ close

# Patterns where ? represents corrupted unicode icons
# We look for ? or ?? between > and </Text> or </ThemedText> near button-related keywords
BUTTON_KEYWORDS = [
    'closeText', 'modalCloseButton', 'backButton', 'smallBold',
    'closeBtn', 'close', 'dismiss', 'goBack',
]

total_fixed = 0

for fname in sorted(os.listdir(app_dir)):
    if not fname.endswith('.tsx'):
        continue
    fpath = os.path.join(app_dir, fname)
    
    try:
        with open(fpath, 'rb') as f:
            raw = f.read()
        text = raw.decode('latin-1')
    except Exception as e:
        print(f"SKIP {fname}: {e}")
        continue
    
    lines = text.split('\n')
    changed = 0
    
    for i, line in enumerate(lines):
        original = line
        
        # Fix back button (ThemedText with smallBold + corrupted ?)
        if 'ThemedText' in line and 'smallBold' in line:
            new_line = re.sub(
                r'(<ThemedText[^>]*>)(\?+)(</ThemedText>)',
                lambda m: m.group(1) + ARROW_LEFT + m.group(3),
                line
            )
            if new_line != original:
                lines[i] = new_line
                changed += 1
                print(f"  [{fname}] line {i+1}: back arrow (ThemedText)")
                continue
        
        # Fix close buttons: ANY <Text style=...> with ? content
        # where the style mentions close, modal, back, or the surrounding context does
        if '<Text' in line and re.search(r'>\?+</', line):
            # Determine if this is a close button or back button
            style_match = re.search(r'style=\{styles\.(\w+)\}', line)
            style_name = style_match.group(1).lower() if style_match else ''
            
            if any(kw in style_name for kw in ['close', 'modal', 'back', 'dismiss']):
                # It's a close/modal button -> ✕
                new_line = re.sub(
                    r'(<Text[^>]*>)(\?+)(</Text>)',
                    lambda m: m.group(1) + CLOSE_X + m.group(3),
                    line
                )
                if new_line != original:
                    lines[i] = new_line
                    changed += 1
                    print(f"  [{fname}] line {i+1}: close X ({style_name})")
                    continue
            elif any(kw in style_name for kw in ['back', 'arrow', 'nav']):
                # Back button -> ←
                new_line = re.sub(
                    r'(<Text[^>]*>)(\?+)(</Text>)',
                    lambda m: m.group(1) + ARROW_LEFT + m.group(3),
                    line
                )
                if new_line != original:
                    lines[i] = new_line
                    changed += 1
                    print(f"  [{fname}] line {i+1}: back arrow ({style_name})")
                    continue
            else:
                # Check surrounding context (look at nearby lines for backButton or close hint)
                context = '\n'.join(lines[max(0,i-3):i+3])
                if 'closeText' in context or 'modalClose' in context or 'formClose' in context:
                    new_line = re.sub(
                        r'(<Text[^>]*>)(\?+)(</Text>)',
                        lambda m: m.group(1) + CLOSE_X + m.group(3),
                        line
                    )
                elif 'backButton' in context or 'goBack' in context:
                    new_line = re.sub(
                        r'(<Text[^>]*>)(\?+)(</Text>)',
                        lambda m: m.group(1) + ARROW_LEFT + m.group(3),
                        line
                    )
                else:
                    new_line = line
                
                if new_line != original:
                    lines[i] = new_line
                    changed += 1
                    print(f"  [{fname}] line {i+1}: context-based fix ({style_name})")
    
    if changed > 0:
        result = '\n'.join(lines)
        with open(fpath, 'wb') as f:
            f.write(result.encode('latin-1'))
        print(f"  SAVED {fname} ({changed} fixes)\n")
        total_fixed += changed
    
print(f"\nTotal fixes across all files: {total_fixed}")
