// auth.ts
//
// Matches Huddle_API_Endpoint_Contract.docx exactly — do not rename
// fields without updating that doc first.
//
// POST /api/auth/register
//   body:    { email, password, name? }
//   success: 201 { message, user: { id, email, name } }
//   errors:  400 (validation), 409 (email already registered)
//
// POST /api/auth/login
//   body:    { email, password }
//   success: 200 { accessToken, user: { id, email, name } }
//   errors:  400 (missing fields), 401 (invalid credentials — generic,
//            never reveals which field was wrong)
//
// All errors come back as: { error: "human message", code?: "..." }

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://huddle-backend-fdnr.onrender.com/api";
// Demo/production base URL: to be provided by backend after deployment —
// set VITE_API_BASE_URL in .env once that's available.

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user: AuthUser;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export class AuthError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

async function parseError(response: Response): Promise<never> {
  let body: { error?: string; code?: string } = {};
  try {
    body = await response.json();
  } catch {
    // non-JSON error body
  }
  throw new AuthError(body.error || "Something went wrong. Please try again.", response.status, body.code);
}

export async function registerUser(data: RegisterData): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) return parseError(response);
  return response.json();
}

export async function loginUser(data: LoginData): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) return parseError(response);
  return response.json();
}
