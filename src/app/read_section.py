import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'c:\Users\ACER\Desktop\mobileapp\frontend\src\app\admin.tsx','rb') as f: raw=f.read()
text = raw.decode('latin-1')
lines = text.split('\n')

print("=== Tab button context (lines 2955-2975) ===")
for i,line in enumerate(lines,1):
    if 2955 <= i <= 2975:
        safe = line.encode('ascii','replace').decode('ascii')
        print(f'{i}: {safe}')

print("\n=== personalTabDot style (lines 5290-5310) ===")
for i,line in enumerate(lines,1):
    if 5290 <= i <= 5310:
        safe = line.encode('ascii','replace').decode('ascii')
        print(f'{i}: {safe}')
