// ====================================================
// Huddle API Client
// Base URL: configured via VITE_API_BASE_URL env var
// Contract: Huddle API Endpoint_Contract.docx
// ====================================================

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://huddle-backend-fdnr.onrender.com/api';

function getToken(): string | null {
  return localStorage.getItem('huddle_token');
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

export async function createChannel(name: string): Promise<ApiChannel> {
  const res = await fetch(`${BASE_URL}/channels`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  const data = await handleResponse<{ channel?: ApiChannel } | ApiChannel>(res);
  if (data && typeof data === 'object' && 'channel' in data && data.channel) {
    return data.channel;
  }
  return data as ApiChannel;
}

// ─── Messages ────────────────────────────────────────

export interface ApiAuthor {
  id: string;
  name?: string;
  email?: string;
}

export interface ApiMessage {
  id: string;
  content: string;
  createdAt: string;
  author?: ApiAuthor;
  userId?: string;
  userName?: string;
  channelId?: string;
}

export interface MessagesResponse {
  channel?: ApiChannel;
  messages: ApiMessage[];
}

export interface SendMessageResponse {
  message: ApiMessage;
}

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  password: string;
  confirmPassword?: string;
};

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse<{ message: string }>(res);
}

export async function resetPassword(token: string, password: string, confirmPassword?: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password, ...(confirmPassword ? { confirmPassword } : {}) }),
  });
  return handleResponse<{ message: string }>(res);
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
  const data = await handleResponse<SendMessageResponse | ApiMessage>(res);
  if (data && typeof data === 'object' && 'message' in data && (data as SendMessageResponse).message) {
    return (data as SendMessageResponse).message;
  }
  return data as ApiMessage;
}
