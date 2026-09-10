export type UserRole =
  | "RestaurantOwner"
  | "Customer"
  | "DeliveryPerson"
  | "Admin";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}