import api from "./api";
import type {
  LoginResponse,
  RegisterRequest,
} from "../types/auth";

export interface LoginRequest {
  email: string;
  password: string;
}

export async function login(
  request: LoginRequest,
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>(
    "/Auth/login",
    request,
  );

  return response.data;
}

export async function register(
  request: RegisterRequest,
) {
  const response = await api.post(
    "/Auth/register",
    request,
  );

  return response.data;
}

export function parseJwt(token: string): { exp?: number; [key: string]: any } | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return false;
  // Exp is in seconds; Date.now() is in ms. Buffer with 5 seconds
  return Date.now() >= (payload.exp * 1000) - 5000;
}

export function getTokenRemainingTimeMs(token: string | null): number {
  if (!token) return 0;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return 0;
  return Math.max(0, payload.exp * 1000 - Date.now());
}

export function logout(): void {
  localStorage.removeItem("savebite_token");
  localStorage.removeItem("savebite_user");
  sessionStorage.clear();
}

export function getStoredToken(): string | null {
  const token = localStorage.getItem("savebite_token");
  if (isTokenExpired(token)) {
    logout();
    return null;
  }
  return token;
}

export function getStoredUser(): LoginResponse["user"] | null {
  const token = localStorage.getItem("savebite_token");
  if (isTokenExpired(token)) {
    logout();
    return null;
  }
  const userJson = localStorage.getItem("savebite_user");
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function storeAuthData(token: string, user: LoginResponse["user"]): void {
  localStorage.setItem("savebite_token", token);
  localStorage.setItem("savebite_user", JSON.stringify(user));
}