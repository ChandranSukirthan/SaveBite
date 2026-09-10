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

export function logout(): void {
  localStorage.removeItem("savebite_token");
  localStorage.removeItem("savebite_user");
}

export function getStoredToken(): string | null {
  return localStorage.getItem("savebite_token");
}

export function getStoredUser(): LoginResponse["user"] | null {
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