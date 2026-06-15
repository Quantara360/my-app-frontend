import os

file_path = r"c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app\admin.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update useAuth
content = content.replace("const { signOut, user } = useAuth();", "const { signOut, user, updateUser } = useAuth();")

# 2. Add updateUser to handleUpdateAdminProfile
old_update = """      setSuccessModalTitle("Profile Updated Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
      setAdminPassword("");"""

new_update = """      await updateUser({ ...user, name: adminName, email: adminEmail } as any);
      setSuccessModalTitle("Profile Updated Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
      setAdminPassword("");"""

content = content.replace(old_update, new_update)

# 3. Update styling for the Admin Profile section
# Target the specific <View style={[styles.tableCard, { marginTop: 16 }]}>
old_card = "<View style={[styles.tableCard, { marginTop: 16 }]}>"
new_card = "<View style={[styles.tableCard, { marginTop: 16, backgroundColor: theme.backgroundElement }]}>"
content = content.replace(old_card, new_card)

# Target the specific form labels in that section
old_label1 = "<Text style={styles.formLabel}>Name</Text>"
new_label1 = "<Text style={[styles.formLabel, { color: theme.text }]}>Name</Text>"
content = content.replace(old_label1, new_label1)

old_label2 = "<Text style={styles.formLabel}>Email</Text>"
new_label2 = "<Text style={[styles.formLabel, { color: theme.text }]}>Email</Text>"
content = content.replace(old_label2, new_label2)

old_label3 = "<Text style={styles.formLabel}>New Password (Optional)</Text>"
new_label3 = "<Text style={[styles.formLabel, { color: theme.text }]}>New Password (Optional)</Text>"
content = content.replace(old_label3, new_label3)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
