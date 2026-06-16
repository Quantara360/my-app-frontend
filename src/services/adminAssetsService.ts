function extractArray(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  if (result && result.data && Array.isArray(result.data.data)) return result.data.data;
  return [];
}

import { API_BASE_URL, getAuthHeaders } from './authService';

export interface Asset {
  id: string | number;
  name: string;
  count: number;
  value: string;
  status?: string;
}

async function getJson<T>(path: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.message || 'Request failed');
    }

    return body;
  } catch (err) {
    console.error('[adminAssetsService] error', err);
    throw err;
  }
}

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.message || 'Request failed');
    }

    return body;
  } catch (err) {
    console.error('[adminAssetsService] error', err);
    throw err;
  }
}

async function putJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.message || 'Request failed');
    }

    return body;
  } catch (err) {
    console.error('[adminAssetsService] error', err);
    throw err;
  }
}

async function deleteJson<T>(path: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.message || 'Request failed');
    }

    return body;
  } catch (err) {
    console.error('[adminAssetsService] error', err);
    throw err;
  }
}

export async function getAssets(): Promise<Asset[]> {
  const result = await getJson<{ data: Asset[] }>('assets');
  return extractArray(result);
}

export async function createAsset(data: Omit<Asset, 'id'>): Promise<Asset> {
  const result = await postJson<{ data: Asset }>('assets', data);
  return result.data ?? result;
}

export async function updateAsset(id: string | number, data: Partial<Asset>): Promise<Asset> {
  const result = await putJson<{ data: Asset }>(`assets/${id}`, data);
  return result.data ?? result;
}

export async function deleteAsset(id: string | number): Promise<void> {
  await deleteJson<void>(`assets/${id}`);
}
