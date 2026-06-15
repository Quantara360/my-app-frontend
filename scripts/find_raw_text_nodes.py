from pathlib import Path
import re
root = Path('src')
pattern = re.compile(r'<([A-Za-z][A-Za-z0-9_]*)[^>]*>([\s\S]*?)</\1>')
for path in root.rglob('*.tsx'):
    text = path.read_text('utf-8')
    for m in pattern.finditer(text):
        tag = m.group(1)
        if tag == 'Text':
            continue
        inner = m.group(2)
        first_line = None
        for line in inner.splitlines():
            s = line.strip()
            if s:
                first_line = s
                break
        if first_line and not first_line.startswith('<') and not first_line.startswith('{') and not first_line.startswith('/*') and not first_line.startswith('//'):
            print(path, tag, repr(first_line))
