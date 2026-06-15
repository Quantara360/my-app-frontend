import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { loginWithApi, type AuthUser, type UserRole, getAuthToken, setInMemoryToken, API_BASE_URL } from '@/services/authService';

const ACCESS_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export type SignInParams = {
  email: string;
  password: string;
  remember?: boolean;
};

export type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  signIn: (params: SignInParams) => Promise<{ user: AuthUser; access_token: string }>;
  signOut: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function saveAuthData(user: AuthUser, token: string) {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
  } catch (e) {}
  if (typeof window !== 'undefined' && window?.localStorage) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
}

async function clearAuthData() {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(AUTH_USER_KEY);
  } catch (e) {}
  if (typeof window !== 'undefined') {
    if (window?.localStorage) {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(AUTH_USER_KEY);
    }
    if (window?.sessionStorage) {
      window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      window.sessionStorage.removeItem(AUTH_USER_KEY);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    async function restoreAuth() {
      try {
        const storedToken = await getAuthToken();
        if (!storedToken) return;

        setToken(storedToken);
        setInMemoryToken(storedToken);

        // Always fetch the latest user from the backend (source of truth)
        // This ensures profile changes are reflected immediately on refresh
        try {
          const res = await fetch(`${API_BASE_URL}/user`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Accept': 'application/json',
            }
          });
          if (res.ok) {
            const freshUser = await res.json();
            if (freshUser && freshUser.id) {
              setUser(freshUser);
              // Persist fresh user data for next restore
              const serialized = JSON.stringify(freshUser);
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(AUTH_USER_KEY, serialized);
                window.sessionStorage?.setItem(AUTH_USER_KEY, serialized);
              }
              try { await SecureStore.setItemAsync(AUTH_USER_KEY, serialized); } catch(e) {}
              return;
            }
          }
        } catch (fetchErr) {
          console.warn('[AuthContext] Could not reach backend, using cached user', fetchErr);
        }

        // Fallback to cached user if backend unreachable
        let storedUser = await SecureStore.getItemAsync(AUTH_USER_KEY).catch(() => null);
        if (!storedUser && typeof window !== 'undefined') {
          storedUser = window?.localStorage?.getItem(AUTH_USER_KEY) ?? window?.sessionStorage?.getItem(AUTH_USER_KEY) ?? null;
        }
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        // Silently handle auth restore errors
      }
    }

    restoreAuth();
  }, []);

  async function signIn(params: SignInParams) {
    const result = await loginWithApi({ email: params.email, password: params.password });
    setUser(result.user);
    setToken(result.access_token);
    setInMemoryToken(result.access_token);

    // Always persist to localStorage so data survives page refreshes
    await saveAuthData(result.user, result.access_token);

    return result;
  }

  async function signOut() {
    setUser(null);
    setToken(null);
    setInMemoryToken(null);
    await clearAuthData();
  }

  async function updateUser(newUser: AuthUser) {
    setUser(newUser);
    if (token) {
      try {
        await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(newUser));
      } catch (e) {}
      if (typeof window !== 'undefined') {
        // Always update both storages so refresh always gets the latest
        const serialized = JSON.stringify(newUser);
        window.localStorage.setItem(AUTH_USER_KEY, serialized);
        if (window?.sessionStorage) {
          window.sessionStorage.setItem(AUTH_USER_KEY, serialized);
        }
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
