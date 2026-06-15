export type UserRole = 'supervisor' | 'officeStaff' | 'admin';

import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Enforce HTTPS in production and support Expo web env values.
function getDevApiBaseUrl() {
  const isProduction = process.env.NODE_ENV === 'production';
  const hostFromEnv = process.env.REACT_APP_API_HOST || Constants.expoConfig?.extra?.API_HOST;
  const defaultHost = typeof window !== 'undefined' ? `${window.location.hostname}:8000` : 'localhost:8000';
  const host = hostFromEnv || defaultHost;
  const protocol = isProduction || host.startsWith('https://') ? 'https://' : 'http://';
  const normalizedHost = host.replace(/https?:\/\//, '');

  if (isProduction && !normalizedHost.startsWith('https')) {
    console.warn('[authService] Warning: API host should use HTTPS in production');
  }

  return `${protocol}${normalizedHost}/api`;
}

export const API_BASE_URL = getDevApiBaseUrl();

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export const ACCESS_TOKEN_KEY = 'auth_token';

let inMemoryToken: string | null = null;

export function setInMemoryToken(token: string | null) {
  inMemoryToken = token;
}

export async function getAuthToken(): Promise<string | null> {
  if (inMemoryToken) return inMemoryToken;
  
  try {
    // Web fallback: prefer sessionStorage, then localStorage when available
    if (typeof window !== 'undefined') {
      if (window?.sessionStorage) {
        const sessionToken = window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
        if (sessionToken) return sessionToken;
      }
      if (window?.localStorage) {
        const webToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
        if (webToken) return webToken;
      }
    }

    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.warn('[authService] Failed to read auth token from SecureStore', error);
    return null;
  }
}

export async function getAuthHeaders(token?: string): Promise<HeadersInit> {
  const authToken = token ?? (await getAuthToken());
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.message || 'Authentication failed');
    }

    return body;
  } catch (err) {
    console.error('[authService] error', err);
    throw err;
  }
}

export async function loginWithApi(params: {
  email: string;
  password: string;
}): Promise<{ user: AuthUser; access_token: string }> {
  const result = await postJson<{ user: AuthUser; access_token: string }>('login', params);
  return result;
}

export async function registerWithApi(params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<AuthUser> {
  const result = await postJson<{ user: AuthUser; access_token: string }>('register', params);
  return result.user;
}
