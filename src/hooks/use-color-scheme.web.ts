// The app only ships a light theme - always report 'light' regardless of the
// device/browser's system appearance setting, instead of following the OS
// preference or a previously stored localStorage value (which would flip the
// UI to dark styling when the OS is in Dark Mode).
export function useColorScheme(): 'light' {
  return 'light';
}
