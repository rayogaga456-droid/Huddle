// sessionStore.ts
//
// Holds the accessToken + user returned from POST /api/auth/login so
// other parts of the app (like the channel/message board) can send
// authenticated requests without threading the token through props
// manually everywhere.

import type { AuthUser } from "./auth";

const TOKEN_KEY = "huddle_access_token";
const USER_KEY = "huddle_user";

export interface Session {
  accessToken: string;
  user: AuthUser;
}

export function saveSession(session: Session): void {
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function getSession(): Session | null {
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!accessToken || !userRaw) return null;
  try {
    return { accessToken, user: JSON.parse(userRaw) };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
