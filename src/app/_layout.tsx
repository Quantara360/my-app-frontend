import { Slot } from "expo-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { useMemo, useEffect } from "react";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ErrorBoundary } from "@/components/error-boundary";

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

  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // ignore
      });
    }
  }, []);

  const authProvider = useMemo(
    () => (
      <ErrorBoundary>
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </ErrorBoundary>
    ),
    []
  );

  return authProvider;
}
