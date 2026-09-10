import api from "./api";
import type {
  CustomerProfile,
  CreateCustomerProfileRequest,
  RestaurantProfile,
  CreateRestaurantProfileRequest,
  DeliveryPersonProfile,
  CreateDeliveryPersonProfileRequest,
} from "../types/profile";

// Customer Profile
export async function getCustomerProfile(): Promise<CustomerProfile | null> {
  try {
    const response = await api.get<CustomerProfile>("/Customer/profile");
    return response.data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

export async function createCustomerProfile(
  payload: CreateCustomerProfileRequest,
): Promise<CustomerProfile> {
  const response = await api.post<{ customer: CustomerProfile }>(
    "/Customer/profile",
    payload,
  );
  return response.data.customer;
}

// Restaurant Profile
export async function getRestaurantProfile(): Promise<RestaurantProfile | null> {
  try {
    const response = await api.get<RestaurantProfile>("/Restaurant/profile");
    return response.data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

export async function createRestaurantProfile(
  payload: CreateRestaurantProfileRequest,
): Promise<RestaurantProfile> {
  const response = await api.post<{ restaurant: RestaurantProfile }>(
    "/Restaurant/profile",
    payload,
  );
  return response.data.restaurant;
}

// Delivery Person Profile
export async function getDeliveryPersonProfile(): Promise<DeliveryPersonProfile | null> {
  try {
    const response = await api.get<DeliveryPersonProfile>("/DeliveryPerson/profile");
    return response.data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

export async function createDeliveryPersonProfile(
  payload: CreateDeliveryPersonProfileRequest,
): Promise<DeliveryPersonProfile> {
  const response = await api.post<{ deliveryPerson: DeliveryPersonProfile }>(
    "/DeliveryPerson/profile",
    payload,
  );
  return response.data.deliveryPerson;
}

export async function updateDeliveryAvailability(
  available: boolean,
): Promise<{ message: string; isAvailable: boolean }> {
  const response = await api.patch<{ message: string; isAvailable: boolean }>(
    `/DeliveryPerson/availability?available=${available}`,
  );
  return response.data;
}
