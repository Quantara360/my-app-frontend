function extractArray(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  if (result && result.data && Array.isArray(result.data.data)) return result.data.data;
  return [];
}

import { API_BASE_URL, getAuthHeaders } from './authService';

export interface Vehicle {
  id: string | number;
  name: string;
  type: string;
  value: string;
  plateNo: string;
}

export interface Jewellery {
  id: string | number;
  name: string;
  value: string;
  weight: string;
}

export interface Property {
  id: string | number;
  location: string;
  value: string;
  area: string;
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
    console.error('[adminPersonalAssetsService] error', err);
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
    console.error('[adminPersonalAssetsService] error', err);
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
    console.error('[adminPersonalAssetsService] error', err);
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
    console.error('[adminPersonalAssetsService] error', err);
    throw err;
  }
}

// Vehicles
export async function getVehicles(): Promise<Vehicle[]> {
  const result = await getJson<{ data: Vehicle[] }>('vehicles');
  return extractArray(result);
}

export async function createVehicle(data: Omit<Vehicle, 'id'>): Promise<Vehicle> {
  const result = await postJson<{ data: Vehicle }>('vehicles', data);
  return result.data ?? result;
}

export async function updateVehicle(id: string | number, data: Partial<Vehicle>): Promise<Vehicle> {
  const result = await putJson<{ data: Vehicle }>(`vehicles/${id}`, data);
  return result.data ?? result;
}

export async function deleteVehicle(id: string | number): Promise<void> {
  await deleteJson<void>(`vehicles/${id}`);
}

// Jewelleries
export async function getJewelleries(): Promise<Jewellery[]> {
  const result = await getJson<{ data: Jewellery[] }>('jewelleries');
  return extractArray(result);
}

export async function createJewellery(data: Omit<Jewellery, 'id'>): Promise<Jewellery> {
  const result = await postJson<{ data: Jewellery }>('jewelleries', data);
  return result.data ?? result;
}

export async function updateJewellery(id: string | number, data: Partial<Jewellery>): Promise<Jewellery> {
  const result = await putJson<{ data: Jewellery }>(`jewelleries/${id}`, data);
  return result.data ?? result;
}

export async function deleteJewellery(id: string | number): Promise<void> {
  await deleteJson<void>(`jewelleries/${id}`);
}

// Properties
export async function getProperties(): Promise<Property[]> {
  const result = await getJson<{ data: Property[] }>('properties');
  return extractArray(result);
}

export async function createProperty(data: Omit<Property, 'id'>): Promise<Property> {
  const result = await postJson<{ data: Property }>('properties', data);
  return result.data ?? result;
}

export async function updateProperty(id: string | number, data: Partial<Property>): Promise<Property> {
  const result = await putJson<{ data: Property }>(`properties/${id}`, data);
  return result.data ?? result;
}

export async function deleteProperty(id: string | number): Promise<void> {
  await deleteJson<void>(`properties/${id}`);
}
