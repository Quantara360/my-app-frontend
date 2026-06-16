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
    file_path: string | null;
    file_url: string | null;
    uploaded_at: string | null;
}

// --- NOTES ---

export const getNotes = async (): Promise<PersonalNote[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/personal-notes`, { headers });
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
    const response = await fetch(`${API_BASE_URL}/personal-files`, { headers });
    if (!response.ok) throw new Error('Failed to fetch files');
    return response.json();
};

export const createFile = async (data: {
    name: string;
    type: string;
    uploaded_at?: string;
    fileUri?: string;
    fileMimeType?: string;
    fileActualName?: string;
}): Promise<PersonalFile> => {
    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('type', data.type);
    if (data.uploaded_at) formData.append('uploaded_at', data.uploaded_at);

    if (data.fileUri) {
        const fileBlob = {
            uri: data.fileUri,
            type: data.fileMimeType || 'application/octet-stream',
            name: data.fileActualName || data.name,
        } as any;
        formData.append('file', fileBlob);
    }

    // Remove Content-Type so browser/RN sets it with boundary
    const { 'Content-Type': _, ...headersWithoutCT } = headers as any;
    const response = await fetch(`${API_BASE_URL}/personal-files`, {
        method: 'POST',
        headers: headersWithoutCT,
        body: formData,
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to create file: ${err}`);
    }
    return response.json();
};

export const updateFile = async (id: string | number, data: {
    name: string;
    type: string;
    uploaded_at?: string;
    fileUri?: string;
    fileMimeType?: string;
    fileActualName?: string;
}): Promise<PersonalFile> => {
    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('type', data.type);
    if (data.uploaded_at) formData.append('uploaded_at', data.uploaded_at);

    if (data.fileUri) {
        const fileBlob = {
            uri: data.fileUri,
            type: data.fileMimeType || 'application/octet-stream',
            name: data.fileActualName || data.name,
        } as any;
        formData.append('file', fileBlob);
    }

    const { 'Content-Type': _, ...headersWithoutCT } = headers as any;
    const response = await fetch(`${API_BASE_URL}/personal-files/${id}`, {
        method: 'POST', // Laravel doesn't support PUT with multipart; use POST with _method
        headers: headersWithoutCT,
        body: (() => { formData.append('_method', 'PUT'); return formData; })(),
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to update file: ${err}`);
    }
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
