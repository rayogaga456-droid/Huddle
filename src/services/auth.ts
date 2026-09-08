// auth.ts
//
// BACKEND CONTRACT — read this first.
//
// POST {API_BASE}/auth/register
//   body:     { fullName: string, email: string, password: string }
//   success:  200 { success: true, message: string, user: { id, fullName, email } }
//   failure:  4xx { success: false, message: string }   e.g. "Email already in use"
//
// POST {API_BASE}/auth/login
//   body:     { email: string, password: string }
//   success:  200 { success: true, message: string, user: { id, fullName, email } }
//   failure:  401 { success: false, message: string }   generic message only —
//             never confirm/deny whether the email exists (see login error-state
//             annotation in the design file: "Deliberately vague about which
//             field is wrong").
//
// Set VITE_API_BASE_URL in a .env file once the real API exists.
// Until then this defaults to "/api" and will 404 loudly rather than
// silently pretending to succeed — that's intentional so nobody mistakes
// mock success for a working integration.

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

async function post(path: string, body: unknown): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: AuthResponse | null = null;
  try {
    data = await response.json();
  } catch {
    // Backend returned a non-JSON body (HTML error page, empty 500, etc.)
  }

  if (!response.ok) {
    throw new AuthError(data?.message || "Something went wrong. Please try again.", response.status);
  }

  if (!data) {
    throw new AuthError("Unexpected empty response from the server.", response.status);
  }

  return data;
}

export function loginUser(data: LoginData): Promise<AuthResponse> {
  return post("/auth/login", data);
}

export function registerUser(data: RegisterData): Promise<AuthResponse> {
  return post("/auth/register", data);
}
