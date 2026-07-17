with open(r'c:\Users\ACER\Desktop\mobileapp\frontend\src\app\admin.tsx','rb') as f: raw=f.read()
text = raw.decode('latin-1')

old_dot = """    personalTabDot: {\r
      position: \"absolute\",\r
      top: -10,\r
      alignSelf: \"center\",\r
      width: 8,\r
      height: 8,\r
      borderRadius: 4,\r
      backgroundColor: \"#22c55e\",\r
    },"""

new_dot = """    personalTabDot: {\r
      position: \"absolute\",\r
      top: -4,\r
      right: -4,\r
      width: 9,\r
      height: 9,\r
      borderRadius: 5,\r
      backgroundColor: \"#22c55e\",\r
    },"""

if old_dot in text:
    text = text.replace(old_dot, new_dot)
    print("Fixed: dot moved to top-right corner of button")
    with open(r'c:\Users\ACER\Desktop\mobileapp\frontend\src\app\admin.tsx','wb') as f:
        f.write(text.encode('latin-1'))
    print("Saved.")
else:
    print("Pattern not found")
