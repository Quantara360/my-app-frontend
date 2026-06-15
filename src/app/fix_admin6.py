import os

file_path = r"c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app\admin.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state variable
old_state = 'const [adminPassword, setAdminPassword] = useState("");'
new_state = 'const [adminPassword, setAdminPassword] = useState("");\n  const [profileError, setProfileError] = useState("");'
content = content.replace(old_state, new_state)

# 2. Reset error state on update start
old_try = "const handleUpdateAdminProfile = async () => {\n    try {"
new_try = "const handleUpdateAdminProfile = async () => {\n    try {\n      setProfileError(\"\");"
content = content.replace(old_try, new_try)

# 3. Set error state on catch instead of modal
old_catch = """    } catch (error: any) {
      setSuccessModalTitle(error.message || "Could not update profile.");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
    }"""
new_catch = """    } catch (error: any) {
      setProfileError(error.message || "Could not update profile.");
    }"""
content = content.replace(old_catch, new_catch)

# 4. Render error message below the password input
old_render = """          </View>
          <Pressable onPress={handleUpdateAdminProfile} style={[styles.addSiteButton, { marginTop: 16 }]}>"""

new_render = """          </View>
          {profileError ? (
            <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 8, marginTop: -8 }}>
              {profileError}
            </Text>
          ) : null}
          <Pressable onPress={handleUpdateAdminProfile} style={[styles.addSiteButton, { marginTop: 16 }]}>"""

content = content.replace(old_render, new_render)

# Additionally clear the error if user types
# I will just replace onChangeText={setAdminPassword} with onChangeText={(text) => {setAdminPassword(text); setProfileError("");}} 
# But doing it for all fields is better.

old_name_input = 'onChangeText={setAdminName}'
new_name_input = 'onChangeText={(text) => { setAdminName(text); setProfileError(""); }}'
content = content.replace(old_name_input, new_name_input)

old_email_input = 'onChangeText={setAdminEmail}'
new_email_input = 'onChangeText={(text) => { setAdminEmail(text); setProfileError(""); }}'
content = content.replace(old_email_input, new_email_input)

old_pass_input = 'onChangeText={setAdminPassword}'
new_pass_input = 'onChangeText={(text) => { setAdminPassword(text); setProfileError(""); }}'
content = content.replace(old_pass_input, new_pass_input)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
