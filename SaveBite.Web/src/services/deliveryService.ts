import api from "./api";
import type {
  DeliveryRequestItem,
  DeliveryResponsePayload,
  UpdateLocationPayload,
} from "../types/delivery";
import type { DeliveryPersonProfile } from "../types/profile";

export async function getMyDeliveryRequests(): Promise<DeliveryRequestItem[]> {
  try {
    const response = await api.get<DeliveryRequestItem[]>("/delivery-person/orders");
    return response.data || [];
  } catch (err: any) {
    if (err.response?.status === 404) return [];
    throw err;
  }
}

export async function respondToDelivery(
  id: string,
  accept: boolean
): Promise<{ message: string; status: string; aiTriggered?: boolean }> {
  const payload: DeliveryResponsePayload = { accept };
  const response = await api.post<{
    message: string;
    status: string;
    aiTriggered?: boolean;
  }>(`/delivery-person/orders/${id}/respond`, payload);
  return response.data;
}

export async function markDeliveryPickedUp(
  id: string
): Promise<{ message: string; status: string }> {
  const response = await api.post<{ message: string; status: string }>(
    `/delivery-person/orders/${id}/pickup`
  );
  return response.data;
}

export async function startDelivery(
  id: string
): Promise<{ message: string; status: string }> {
  const response = await api.post<{ message: string; status: string }>(
    `/delivery-person/orders/${id}/start`
  );
  return response.data;
}

export async function completeDelivery(
  id: string
): Promise<{ message: string; status: string; driverAvailable: boolean }> {
  const response = await api.post<{
    message: string;
    status: string;
    driverAvailable: boolean;
  }>(`/delivery-person/orders/${id}/complete`);
  return response.data;
}

export async function updateDeliveryLocation(
  latitude: number,
  longitude: number
): Promise<{ message: string; location?: any }> {
  const payload: UpdateLocationPayload = { latitude, longitude };
  const response = await api.put<{ message: string; location?: any }>(
    "/delivery-person/location",
    payload
  );
  return response.data;
}

export async function updateDeliveryAvailability(
  available: boolean
): Promise<{ message: string; isAvailable: boolean }> {
  const response = await api.patch<{ message: string; isAvailable: boolean }>(
    `/DeliveryPerson/availability?available=${available}`
  );
  return response.data;
}

export async function getDeliveryPersonProfile(): Promise<DeliveryPersonProfile | null> {
  try {
    const response = await api.get<DeliveryPersonProfile>(
      "/DeliveryPerson/profile"
    );
    return response.data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}
