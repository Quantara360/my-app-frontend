import { API_BASE_URL, getAuthHeaders } from './authService';

export interface AttendanceRecord {
  id: string | number;
  worker_id: number;
  worksite_id?: number | null;
  shift: string;
  date: string;
  marked_at: string;
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
  return result.data;
}
