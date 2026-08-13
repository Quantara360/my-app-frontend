// The app only ships a light theme - always report 'light' regardless of the
// device's system appearance setting, instead of following react-native's
// useColorScheme (which would flip the UI to dark styling when the OS is in
// Dark Mode / auto night mode).
export function useColorScheme(): 'light' {
  return 'light';
}
