import { API_BASE_URL, getAuthHeaders } from './authService';

export interface Approval {
  id: string | number;
  description: string;
  amount: string;
  date: string;
  holder: string;
  status: string;
  worksite_id?: number | null;
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
    console.error('[adminApprovalsService] error', err);
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
    console.error('[adminApprovalsService] error', err);
    throw err;
  }
}

async function patchJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.message || 'Request failed');
    }

    return body;
  } catch (err) {
    console.error('[adminApprovalsService] error', err);
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
    console.error('[adminApprovalsService] error', err);
    throw err;
  }
}

export async function getApprovals(): Promise<Approval[]> {
  const result = await getJson<{ data: any[] }>('approvals');
  return (result.data || []).map((item: any) => ({
    id: item.id,
    description: item.title || item.description || '',
    amount: item.amount || '',
    date: item.date || '',
    holder: item.holder || '',
    status: item.status || 'pending',
    worksite_id: item.worksite_id ?? null,
  }));
}

export async function createApproval(data: Omit<Approval, 'id'>): Promise<Approval> {
  const result = await postJson<{ data: Approval }>('approvals', data);
  return result.data;
}

export async function approveApproval(id: string | number, reason?: string): Promise<Approval> {
  const result = await patchJson<{ data: Approval }>(`approvals/${id}/approve`, { reason });
  return result.data;
}

export async function rejectApproval(id: string | number, reason: string): Promise<void> {
  await deleteJson<void>(`approvals/${id}?reason=${encodeURIComponent(reason)}`);
}
