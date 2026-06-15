import os

file_path = r"c:\xampp1\htdocs\MyFirstProject (1)\MyFirstProject\src\app\admin.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = """      const response = await fetch(`${API_BASE_URL}/profile`, {
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
      await updateUser({ ...user, name: adminName, email: adminEmail } as any);
      setSuccessModalTitle("Profile Updated Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
      setAdminPassword("");
    } catch (error) {
      Alert.alert("Error", "Could not update profile.");
    }"""

new_block = """      const response = await fetch(`${API_BASE_URL}/profile`, {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }

      const data = await response.json();
      // data.user comes from backend response
      await updateUser(data.user);
      
      setSuccessModalTitle("Profile Updated Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
      setAdminPassword("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not update profile.");
    }"""

content = content.replace(old_block, new_block)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
