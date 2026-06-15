import os

file_path = r"c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app\admin.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = """      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }"""

new_block = """      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          const firstError = Object.values(errorData.errors)[0];
          const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          throw new Error(errorMessage as string);
        }
        throw new Error(errorData.message || "Failed to update profile");
      }"""

content = content.replace(old_block, new_block)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
