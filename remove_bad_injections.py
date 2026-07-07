"""
Remove all wrongly-injected Bonds else-if blocks from admin.tsx
The pattern:
      } else if (card.title === "Bonds") {
      router.push("/bonds");
    } else {
should be replaced with just:
      } else {
"""

target_file = r'c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app\admin.tsx'
with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to remove - the bad injection
bad = '      } else if (card.title === "Bonds") {\n      router.push("/bonds");\n    } else {'
good = '      } else {'

count = content.count(bad)
print(f"Found {count} occurrences of bad pattern")
content = content.replace(bad, good)

# Also handle variant with router.push without semicolon
bad2 = '      } else if (card.title === "Bonds") {\n      router.push("/bonds")\n    } else {'
count2 = content.count(bad2)
print(f"Found {count2} variant occurrences")
content = content.replace(bad2, good)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done!")
