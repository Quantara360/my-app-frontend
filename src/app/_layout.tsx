import { Slot } from "expo-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { useMemo, useEffect } from "react";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const scheme = useColorScheme();

  useEffect(() => {
    // Only run in a browser environment
    if (typeof document !== "undefined" && scheme) {
      try {
        document.documentElement.setAttribute("data-theme", scheme);
      } catch (e) {
        // ignore
      }
    }
  }, [scheme]);

  const authProvider = useMemo(
    () => (
      <AuthProvider>
        <Slot />
      </AuthProvider>
    ),
    []
  );

  return authProvider;
}
