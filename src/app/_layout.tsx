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
    // sw.js did nothing but a bare pass-through fetch() with no actual
    // caching/offline benefit - and that exact pattern is a known trigger
    // for the browser to treat OTHER same-origin requests it intercepts as
    // tainted, which surfaces as uncaught errors reporting as the generic,
    // undebuggable "Script error." (no message/file/line) instead of the
    // real error - exactly what the +html.tsx fatal-error banner was
    // showing. A service worker persists and keeps controlling the page
    // across launches once registered, so this was far more likely to be
    // actively intercepting on an already-installed PWA (reopened from the
    // home screen icon) than a fresh Safari tab, which lines up with this
    // only being reported there. Neither iOS's "Add to Home Screen" nor
    // this app's own functionality ever depended on a service worker being
    // registered, so this has no downside - actively unregistering any
    // existing one (not just stopping future registration) is required to
    // actually clear it from devices that already have this installed.
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        })
        .catch(() => {
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
