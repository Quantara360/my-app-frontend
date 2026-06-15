import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";

export default function MoreOptionsMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  const handleLogout = () => {
    setIsOpen(false);
    router.replace("/login" as any);
  };

  const handleEditProfile = () => {
    setIsOpen(false);
    router.push("/register" as any);
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
          pressed && styles.triggerPressed,
        ]}
        onPress={() => setIsOpen((prev) => !prev)}
      >
        <Text style={[styles.triggerText, { color: theme.text }]}>⋮</Text>
      </Pressable>

      {isOpen && (
        <View style={[styles.menuOverlay, { backgroundColor: theme.backgroundElement }]}> 
          <Pressable style={styles.menuItem} onPress={handleEditProfile}>
            <Text style={[styles.menuItemText, { color: theme.text }]}>Edit Profile</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={handleLogout}>
            <Text style={[styles.menuItemText, { color: theme.text }]}>Logout</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "flex-end",
  },
  trigger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  triggerPressed: {
    opacity: 0.7,
  },
  triggerText: {
    fontSize: 20,
    lineHeight: 22,
    color: "#333",
  },
  menuOverlay: {
    position: "absolute",
    top: 44,
    right: 2,
    minWidth: 140,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 100,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    color: "#1f1d21",
    fontSize: 15,
    lineHeight: 20,
  },
});
