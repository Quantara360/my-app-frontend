export type UserRole = 'supervisor' | 'officeStaff' | 'admin';

import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Switched to local SQLite server — change back to 'https://api.abeysone.cloud/api' for production
export const API_BASE_URL = 'http://192.168.8.172:8000/api';

export type AuthUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  worksite_id?: number | null;
  hospital_ids?: number[];
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
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // fetch itself threw - no connection, DNS failure, etc. Give the user
    // something actionable instead of the raw "Network request failed".
    console.error('[authService] network error', err);
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  // The server can fail before it ever produces JSON (a raw 500/502 HTML
  // page, an empty body) - don't let response.json() throw a cryptic
  // "Unexpected token <" past this function.
  let body: any = null;
  try {
    body = await response.json();
  } catch (parseErr) {
    console.error('[authService] non-JSON response', response.status, parseErr);
  }

  if (!response.ok) {
    const message = body?.message || `Request failed (${response.status})`;
    console.error('[authService] error', message);
    throw new Error(message);
  }

  return body as T;
}

export async function loginWithApi(params: {
  username: string;
  password: string;
}): Promise<{ user: AuthUser; access_token: string }> {
  const result = await postJson<{ user: AuthUser; access_token: string }>('login', params);
  return result;
}

export async function registerWithApi(params: {
  name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  worksite_id?: number | null;
  hospital_ids?: number[];
}): Promise<AuthUser> {
  const result = await postJson<{ user: AuthUser; access_token: string }>('register', params);
  return result.user;
}
