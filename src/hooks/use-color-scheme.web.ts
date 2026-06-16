import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme, Appearance } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 * and synced with localStorage to persist user preference.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [storedScheme, setStoredScheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (saved) {
        setStoredScheme(saved);
        Appearance.setColorScheme(saved);
      }
    }
    setHasHydrated(true);
  }, []);

  // Listen to Appearance changes to keep localStorage in sync if theme is toggled
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) {
        setStoredScheme(colorScheme);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('theme', colorScheme);
          document.documentElement.setAttribute('data-theme', colorScheme);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const rnScheme = useRNColorScheme();

  if (hasHydrated) {
    return storedScheme ?? rnScheme ?? 'light';
  }

  return 'light';
}
