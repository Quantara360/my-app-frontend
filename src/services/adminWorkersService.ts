function extractArray(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  if (result && result.data && Array.isArray(result.data.data)) return result.data.data;
  return [];
}

import { API_BASE_URL, getAuthHeaders } from './authService';

export interface Worker {
  id: string | number;
  name: string;
  site: string;
  type: string;
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
    console.error('[adminWorkersService] error', err);
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
    console.error('[adminWorkersService] error', err);
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
    console.error('[adminWorkersService] error', err);
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
    console.error('[adminWorkersService] error', err);
    throw err;
  }
}

export async function getWorkers(): Promise<Worker[]> {
  const result = await getJson<{ data: Worker[] }>('workers');
  return extractArray(result);
}

export async function createWorker(data: Omit<Worker, 'id'>): Promise<Worker> {
  const result = await postJson<{ data: Worker }>('workers', data);
  return result.data ?? result;
}

export async function updateWorker(id: string | number, data: Partial<Worker>): Promise<Worker> {
  const result = await putJson<{ data: Worker }>(`workers/${id}`, data);
  return result.data ?? result;
}

export async function deleteWorker(id: string | number): Promise<void> {
  await deleteJson<void>(`workers/${id}`);
}

export async function terminateWorker(id: string | number): Promise<Worker> {
  const result = await putJson<{ data: Worker }>(`workers/${id}/terminate`, {});
  return result.data ?? result;
}
