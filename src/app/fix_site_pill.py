import os
import re

directory = r"c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app"

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = re.sub(
                r"<View style=\{\{\s*position:\s*'relative',\s*zIndex:\s*10,\s*flex:\s*1,\s*minWidth:\s*140,\s*height:\s*40\s*\}\}>",
                r"<View style={{ position: 'relative', zIndex: 10, flex: 1, minWidth: 140 }}>",
                content
            )
            
            new_content = re.sub(
                r"(\[styles\.searchInput,\s*\{[^}]*)height:\s*'100%'([^}]*\}\])",
                r"\1minHeight: 44\2",
                new_content
            )
            
            if content != new_content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Fixed {file}")
