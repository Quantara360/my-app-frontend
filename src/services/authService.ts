export type UserRole = 'supervisor' | 'officeStaff' | 'admin';

import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Production API base URL
export const API_BASE_URL = 'https://abeysone.cloud/api';

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
