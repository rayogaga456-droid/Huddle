// ====================================================
// Huddle API Client
// Base URL: configured via VITE_API_BASE_URL env var
// Contract: Huddle API Endpoint_Contract.docx
// ====================================================

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://huddle-backend-fdnr.onrender.com/api';

function getToken(): string | null {
  return localStorage.getItem('huddle_access_token');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error ?? msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface RegisterResponse {
  message: string;
  user: AuthUser;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export async function registerUser(
  email: string,
  password: string,
  name?: string,
): Promise<RegisterResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  return handleResponse<RegisterResponse>(res);
}

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<LoginResponse>(res);
}

// ─── Channels ────────────────────────────────────────

export interface ApiChannel {
  id: string;
  name: string;
}

export interface ChannelsResponse {
  channels: ApiChannel[];
}

export async function getChannels(): Promise<ChannelsResponse> {
  const res = await fetch(`${BASE_URL}/channels`, {
    headers: authHeaders(),
  });
  return handleResponse<ChannelsResponse>(res);
}

// ─── Messages ────────────────────────────────────────

export interface ApiMessage {
  id: string;
  content: string;
  userId: string;
  userName: string;
  channelId: string;
  createdAt: string;
}

export interface MessagesResponse {
  messages: ApiMessage[];
}

export async function getMessages(channelId: string): Promise<MessagesResponse> {
  const res = await fetch(`${BASE_URL}/channels/${channelId}/messages`, {
    headers: authHeaders(),
  });
  return handleResponse<MessagesResponse>(res);
}

export async function sendMessage(
  channelId: string,
  content: string,
): Promise<ApiMessage> {
  const res = await fetch(`${BASE_URL}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  });
  return handleResponse<ApiMessage>(res);
}
