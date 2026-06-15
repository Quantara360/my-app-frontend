import os
import re

file_path = r"c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app\admin.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update useAuth and add state for admin profile
old_useauth = "  const { signOut } = useAuth();"
new_useauth = """  const { signOut, user } = useAuth();
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    if (user) {
      setAdminName(user.name || "");
      setAdminEmail(user.email || "");
    }
  }, [user]);

  const handleUpdateAdminProfile = async () => {
    try {
      // API call to update profile
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'POST', // or PUT depending on backend, using POST as fallback
        headers: {
          ...(await getAuthHeaders()),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          ...(adminPassword ? { password: adminPassword } : {})
        })
      });
      setSuccessModalTitle("Profile Updated Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
      setAdminPassword("");
    } catch (error) {
      Alert.alert("Error", "Could not update profile.");
    }
  };
"""
content = content.replace(old_useauth, new_useauth)

# 2. Replace "Hii Malith, Welcome!"
content = content.replace("Hii Malith, Welcome!", "Hii {user?.name || \"Admin\"}, Welcome!")

# 3. Replace renderPersonalView entirely
# Find start of renderPersonalView
start_str = "  const renderPersonalView = () => {"
end_str = "    );\n  };\n\n  const renderPersonalAddModal ="

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_render = """  const renderPersonalView = () => {
    return (
      <View style={styles.personalContainer}>
        <View style={[styles.headerSection, styles.greetingContainer]}>
          <ThemedText type="subtitle" style={styles.greeting}>
            Hii {user?.name || "Admin"}, Welcome!
          </ThemedText>
        </View>

        <View style={styles.personalHeader}>
          <Pressable
            onPress={() => setSelectedView("dashboard")}
            style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}
          >
            <Text style={[styles.backButtonIcon, { color: theme.text }]}>‹</Text>
          </Pressable>
          <ThemedText type="subtitle" style={styles.personalTitle}>
            Admin Profile
          </ThemedText>
        </View>

        <View style={[styles.tableCard, { marginTop: 16 }]}>
          <View style={[styles.formRow, { marginBottom: 16 }]}>
            <Text style={styles.formLabel}>Name</Text>
            <TextInput
              value={adminName}
              onChangeText={setAdminName}
              placeholder="Enter name"
              placeholderTextColor={theme.textSecondary}
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>
          <View style={[styles.formRow, { marginBottom: 16 }]}>
            <Text style={styles.formLabel}>Email</Text>
            <TextInput
              value={adminEmail}
              onChangeText={setAdminEmail}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.textSecondary}
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>
          <View style={[styles.formRow, { marginBottom: 16 }]}>
            <Text style={styles.formLabel}>New Password (Optional)</Text>
            <TextInput
              value={adminPassword}
              onChangeText={setAdminPassword}
              placeholder="Enter new password"
              secureTextEntry
              placeholderTextColor={theme.textSecondary}
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>
          <Pressable onPress={handleUpdateAdminProfile} style={[styles.addSiteButton, { marginTop: 16 }]}>
            <Text style={styles.addSiteButtonText}>Save Changes</Text>
          </Pressable>
        </View>
      </View>
"""
    # Replace the chunk
    content = content[:start_idx] + new_render + content[end_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
