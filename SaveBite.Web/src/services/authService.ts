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