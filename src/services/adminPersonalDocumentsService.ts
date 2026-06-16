import { API_BASE_URL, getAuthHeaders } from './authService';

export interface PersonalNote {
    id: string | number;
    text: string;
    date: string | null;
}

export interface PersonalFile {
    id: string | number;
    name: string;
    type: string;
    uploaded_at: string | null;
}

// --- NOTES ---

export const getNotes = async (): Promise<PersonalNote[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/personal-notes`, {
        headers,
    });
    if (!response.ok) throw new Error('Failed to fetch notes');
    return response.json();
};

export const createNote = async (data: { text: string, date?: string }): Promise<PersonalNote> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/personal-notes`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create note');
    return response.json();
};

export const updateNote = async (id: string | number, data: { text: string, date?: string }): Promise<PersonalNote> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/personal-notes/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update note');
    return response.json();
};

export const deleteNote = async (id: string | number): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/personal-notes/${id}`, {
        method: 'DELETE',
        headers,
    });
    if (!response.ok) throw new Error('Failed to delete note');
};

// --- FILES ---

export const getFiles = async (): Promise<PersonalFile[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/personal-files`, {
        headers,
    });
    if (!response.ok) throw new Error('Failed to fetch files');
    return response.json();
};

export const createFile = async (data: { name: string, type: string, uploaded_at?: string }): Promise<PersonalFile> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/personal-files`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create file');
    return response.json();
};

export const updateFile = async (id: string | number, data: { name: string, type: string, uploaded_at?: string }): Promise<PersonalFile> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/personal-files/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update file');
    return response.json();
};

export const deleteFile = async (id: string | number): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/personal-files/${id}`, {
        method: 'DELETE',
        headers,
    });
    if (!response.ok) throw new Error('Failed to delete file');
};
