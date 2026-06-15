import os

file_path = r"c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app\admin.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_catch = """    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not update profile.");
    }"""

new_catch = """    } catch (error: any) {
      setSuccessModalTitle(error.message || "Could not update profile.");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
    }"""

content = content.replace(old_catch, new_catch)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
