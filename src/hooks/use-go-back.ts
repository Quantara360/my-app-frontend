import { useRouter } from "expo-router";

/**
 * Returns a safe `goBack` function that falls back to the home screen
 * when there is no history in the navigator stack (e.g. direct page load on web).
 */
export function useGoBack(fallback = "/") {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(fallback as any);
    }
  };
}
