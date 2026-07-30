import { API_BASE_URL, getAuthHeaders } from './authService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AccountEntry {
  id: number;
  date: string;
  cheque_no: string | null;
  description: string | null;
  debit: number | null;
  credit: number | null;
  balance: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractArray(result: any): AccountEntry[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  if (result && result.data && Array.isArray(result.data.data)) return result.data.data;
  return [];
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Request failed');
  return body;
}

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Request failed');
  return body;
}

async function putJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Request failed');
  return body;
}

async function deleteJson(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Request failed');
  }
}

// ─── Cash In Hand ─────────────────────────────────────────────────────────────

export async function getCashInHandEntries(): Promise<AccountEntry[]> {
  const result = await getJson<{ data: AccountEntry[] }>('cash-in-hand-entries');
  return extractArray(result);
}

export async function createCashInHandEntry(
  data: Omit<AccountEntry, 'id'>
): Promise<AccountEntry> {
  const result = await postJson<{ data: AccountEntry }>('cash-in-hand-entries', {
    date:        data.date,
    cheque_no:   data.cheque_no ?? null,
    description: data.description ?? null,
    debit:       data.debit,
    credit:      data.credit,
    balance:     data.balance,
  });
  return result.data ?? (result as any);
}

export async function updateCashInHandEntry(
  id: number,
  data: Omit<AccountEntry, 'id'>
): Promise<AccountEntry> {
  const result = await putJson<{ data: AccountEntry }>(`cash-in-hand-entries/${id}`, {
    date:        data.date,
    cheque_no:   data.cheque_no ?? null,
    description: data.description ?? null,
    debit:       data.debit,
    credit:      data.credit,
    balance:     data.balance,
  });
  return result.data ?? (result as any);
}

export async function deleteCashInHandEntry(id: number): Promise<void> {
  await deleteJson(`cash-in-hand-entries/${id}`);
}

// ─── Bank ─────────────────────────────────────────────────────────────────────

export async function getBankEntries(): Promise<AccountEntry[]> {
  const result = await getJson<{ data: AccountEntry[] }>('bank-entries');
  return extractArray(result);
}

export async function createBankEntry(
  data: Omit<AccountEntry, 'id'>
): Promise<AccountEntry> {
  const result = await postJson<{ data: AccountEntry }>('bank-entries', {
    date:        data.date,
    cheque_no:   data.cheque_no ?? null,
    description: data.description ?? null,
    debit:       data.debit,
    credit:      data.credit,
    balance:     data.balance,
  });
  return result.data ?? (result as any);
}

export async function updateBankEntry(
  id: number,
  data: Omit<AccountEntry, 'id'>
): Promise<AccountEntry> {
  const result = await putJson<{ data: AccountEntry }>(`bank-entries/${id}`, {
    date:        data.date,
    cheque_no:   data.cheque_no ?? null,
    description: data.description ?? null,
    debit:       data.debit,
    credit:      data.credit,
    balance:     data.balance,
  });
  return result.data ?? (result as any);
}

export async function deleteBankEntry(id: number): Promise<void> {
  await deleteJson(`bank-entries/${id}`);
}

// — Ledger Settings ─────────────────────────────

export async function getLedgerPrevBalance(
  ledgerType: 'bank' | 'cash_in_hand'
): Promise<number | null> {
  const result = await getJson<{ data: { manual_prev_balance: number | null } }>(
    `ledger-settings/${ledgerType}`
  );
  const val = (result as any).data?.manual_prev_balance;
  return val !== null && val !== undefined ? Number(val) : null;
}

export async function setLedgerPrevBalance(
  ledgerType: 'bank' | 'cash_in_hand',
  value: number
): Promise<void> {
  await putJson(`ledger-settings/${ledgerType}`, { manual_prev_balance: value });
}
