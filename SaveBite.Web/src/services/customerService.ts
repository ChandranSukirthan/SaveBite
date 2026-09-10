import api from "./api";
import type {
  DiscoveredFoodItem,
  FoodSearchFilter,
  CreateCustomerOrderPayload,
  DiscoveredRestaurantDetails,
} from "../types/customer";
import type { Order } from "../types/restaurant";

export async function searchNearbyFood(
  filter: FoodSearchFilter
): Promise<DiscoveredFoodItem[]> {
  try {
    const response = await api.post<DiscoveredFoodItem[]>(
      "/food-discovery/search",
      filter
    );
    return response.data || [];
  } catch (err: any) {
    if (err.response?.status === 404) return [];
    throw err;
  }
}

export async function getFoodDiscoveryDetails(id: string): Promise<any> {
  const response = await api.get(`/food-discovery/${id}`);
  return response.data;
}

export async function getRestaurantDiscoveryDetails(
  id: string
): Promise<DiscoveredRestaurantDetails> {
  const response = await api.get<DiscoveredRestaurantDetails>(
    `/food-discovery/restaurant/${id}`
  );
  return response.data;
}

export async function getMyCustomerOrders(): Promise<Order[]> {
  try {
    const response = await api.get<Order[]>("/Order");
    return response.data || [];
  } catch (err: any) {
    if (err.response?.status === 404) return [];
    throw err;
  }
}

export async function createCustomerOrder(
  payload: CreateCustomerOrderPayload
): Promise<Order> {
  const response = await api.post<{ message: string; order: Order }>(
    "/Order",
    payload
  );
  return response.data.order;
}

