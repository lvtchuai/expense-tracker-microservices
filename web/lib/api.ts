'use client';

import {
  AUTH_URL,
  GROUP_URL,
  REPORT_URL,
  TOKEN_KEY,
  TRANSACTION_URL,
  USER_KEY,
} from './config';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: string;
  category: string;
  note?: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface Summary {
  income: string;
  expense: string;
  balance: string;
}

export interface MonthlyReport {
  period: { year: number; month: number };
  totals: { income: string; expense: string; balance: string };
  byCategory: { category: string; total: number; count: number }[];
  dailyExpense: number[];
  topExpenseCategories: { category: string; total: number; count: number }[];
  comparedToPrevMonth: {
    prevExpense: string;
    deltaExpense: string;
    pctChange: string | null;
  };
  transactionCount: number;
}

// --- token storage ---
export const token = {
  get: () =>
    typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export const storedUser = {
  get: (): AuthUser | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  set: (u: AuthUser) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  url: string,
  init: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (auth) {
    const t = token.get();
    if (t) headers.set('authorization', `Bearer ${t}`);
  }
  const res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    token.clear();
    throw new ApiError(401, 'Session expired — please log in again.');
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  // 204 or empty
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

const json = { 'content-type': 'application/json' };

// --- auth-service ---
export const authApi = {
  register: (email: string, password: string, displayName?: string) =>
    request<{ accessToken: string; user: AuthUser }>(
      `${AUTH_URL}/api/auth/register`,
      { method: 'POST', headers: json, body: JSON.stringify({ email, password, displayName }) },
      false,
    ),
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: AuthUser }>(
      `${AUTH_URL}/api/auth/login`,
      { method: 'POST', headers: json, body: JSON.stringify({ email, password }) },
      false,
    ),
};

// --- transaction-service ---
export interface TxFilters {
  type?: 'income' | 'expense';
  category?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export const txApi = {
  list: (filters: TxFilters = {}) => {
    const p = new URLSearchParams();
    if (filters.type) p.set('type', filters.type);
    if (filters.category) p.set('category', filters.category);
    if (filters.search) p.set('search', filters.search);
    if (filters.from) p.set('from', filters.from);
    if (filters.to) p.set('to', filters.to);
    p.set('limit', String(filters.limit ?? 20));
    p.set('offset', String(filters.offset ?? 0));
    return request<{
      items: Transaction[];
      total: number;
      limit: number;
      offset: number;
    }>(`${TRANSACTION_URL}/api/transactions?${p.toString()}`);
  },
  create: (input: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    note?: string;
    occurredAt: string;
  }) =>
    request<Transaction>(`${TRANSACTION_URL}/api/transactions`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify(input),
    }),
  update: (
    id: string,
    patch: Partial<{
      type: 'income' | 'expense';
      amount: number;
      category: string;
      note: string;
      occurredAt: string;
    }>,
  ) =>
    request<Transaction>(`${TRANSACTION_URL}/api/transactions/${id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify(patch),
    }),
  remove: (id: string) =>
    request<{ deleted: boolean }>(`${TRANSACTION_URL}/api/transactions/${id}`, {
      method: 'DELETE',
    }),
  summary: () =>
    request<Summary>(`${TRANSACTION_URL}/api/transactions/summary`),
  importCsv: (csv: string) =>
    request<{ enqueued: number }>(
      `${TRANSACTION_URL}/api/transactions/import`,
      { method: 'POST', headers: { 'content-type': 'text/csv' }, body: csv },
    ),
};

// --- report-service ---
export const reportApi = {
  monthly: (year: number, month: number) =>
    request<MonthlyReport>(
      `${REPORT_URL}/api/reports/monthly?year=${year}&month=${month}`,
    ),
};

// --- group-service ---
export interface GroupSummary {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  totalSpent: string;
}
export interface GroupMemberDTO {
  userId: string;
  email: string;
  displayName: string | null;
}
export interface GroupExpenseDTO {
  id: string;
  kind: 'expense' | 'payment';
  paidBy: string;
  amount: string;
  description: string;
  participantIds: string[];
  occurredAt: string;
}
export interface GroupDetail {
  id: string;
  name: string;
  ownerId: string;
  members: GroupMemberDTO[];
  expenses: GroupExpenseDTO[];
  balances: {
    perMember: {
      userId: string;
      displayName: string;
      paid: number;
      share: number;
      net: number;
    }[];
    settlements: { from: string; to: string; amount: string }[];
  };
}

export const groupApi = {
  list: () => request<GroupSummary[]>(`${GROUP_URL}/api/groups`),
  create: (name: string) =>
    request<GroupDetail>(`${GROUP_URL}/api/groups`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ name }),
    }),
  detail: (id: string) =>
    request<GroupDetail>(`${GROUP_URL}/api/groups/${id}`),
  addMember: (id: string, email: string) =>
    request<GroupDetail>(`${GROUP_URL}/api/groups/${id}/members`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ email }),
    }),
  addExpense: (
    id: string,
    input: {
      paidBy: string;
      amount: number;
      description: string;
      participantIds: string[];
      occurredAt?: string;
    },
  ) =>
    request<GroupDetail>(`${GROUP_URL}/api/groups/${id}/expenses`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify(input),
    }),
  deleteEntry: (id: string, entryId: string) =>
    request<GroupDetail>(
      `${GROUP_URL}/api/groups/${id}/expenses/${entryId}`,
      { method: 'DELETE' },
    ),
  settle: (id: string, from: string, to: string, amount: number) =>
    request<GroupDetail>(`${GROUP_URL}/api/groups/${id}/settle`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ from, to, amount }),
    }),
  removeMember: (id: string, memberId: string) =>
    request<GroupDetail>(
      `${GROUP_URL}/api/groups/${id}/members/${memberId}`,
      { method: 'DELETE' },
    ),
  deleteGroup: (id: string) =>
    request<{ deleted: boolean }>(`${GROUP_URL}/api/groups/${id}`, {
      method: 'DELETE',
    }),
};
