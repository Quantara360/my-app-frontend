function extractArray(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  if (result && result.data && Array.isArray(result.data.data)) return result.data.data;
  return [];
}

import { API_BASE_URL, getAuthHeaders } from './authService';

export interface AttendanceRecord {
  id: string | number;
  worker_id: number;
  worksite_id?: number | null;
  sub_site_id?: number | null;
  shift: string;
  date: string;
  marked_at: string | null;
  out_marked_at?: string | null;
  status: string;
  method?: string;
  confidence?: number;
  worker?: {
    id: number;
    name: string;
  };
  worksite?: {
    id: number;
    name: string;
  };
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
    console.error('[adminAttendancesService] error', err);
    throw err;
  }
}

export async function getAttendances(): Promise<AttendanceRecord[]> {
  const result = await getJson<{ data: AttendanceRecord[] }>('attendances');
  return extractArray(result);
}

/** Fetch attendances with absent-worker generation (requires worksite_id + date + shift). */
export async function getAttendancesWithAbsents(params: {
  worksiteId: number | string;
  date: string;   // "YYYY-MM-DD"
  shift: string;  // "Morning" | "Evening"
}): Promise<AttendanceRecord[]> {
  const qs = new URLSearchParams({
    worksite_id: String(params.worksiteId),
    date: params.date,
    shift: params.shift,
    include_absents: '1',
  }).toString();
  const result = await getJson<{ data: AttendanceRecord[] }>(`attendances?${qs}`);
  return extractArray(result);
}

export async function deleteAttendance(id: string | number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/attendances/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Delete failed');
  }
}
