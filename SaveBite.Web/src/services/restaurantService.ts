import api from "./api";
import type {
  Order,
  OrderStatus,
  FoodItem,
  CreateFoodPayload,
  AppNotification,
  UpdateOrderStatusResponse,
} from "../types/restaurant";

// ============================================================
// ORDERS (Milestone 6 & 8)
// ============================================================

export async function getRestaurantOrders(): Promise<Order[]> {
  try {
    const response = await api.get<Order[]>("/restaurant/orders");
    return response.data || [];
  } catch (err: any) {
    if (err.response?.status === 404) return [];
    throw err;
  }
}

export async function getRestaurantOrder(id: string): Promise<Order> {
  const response = await api.get<Order>(`/restaurant/orders/${id}`);
  return response.data;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<UpdateOrderStatusResponse> {
  const response = await api.patch<UpdateOrderStatusResponse>(
    `/restaurant/orders/${id}/status`,
    { status }
  );
  return response.data;
}

// ============================================================
// SURPLUS FOOD CRUD (Milestone 7)
// ============================================================

export async function getMyFood(): Promise<FoodItem[]> {
  try {
    const response = await api.get<FoodItem[]>("/Food/my-food");
    return response.data || [];
  } catch (err: any) {
    if (err.response?.status === 404) return [];
    throw err;
  }
}

export async function getFoodById(id: string): Promise<FoodItem> {
  const response = await api.get<FoodItem>(`/Food/${id}`);
  return response.data;
}

export async function createFood(payload: CreateFoodPayload): Promise<FoodItem> {
  const response = await api.post<{ message: string; food: FoodItem }>("/Food", payload);
  return response.data.food;
}

export async function updateFood(
  id: string,
  payload: CreateFoodPayload
): Promise<FoodItem> {
  const response = await api.put<{ message: string; food: FoodItem }>(
    `/Food/${id}`,
    payload
  );
  return response.data.food;
}

export async function deleteFood(id: string): Promise<void> {
  await api.delete(`/Food/${id}`);
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function getNotifications(
  limit: number = 50
): Promise<AppNotification[]> {
  try {
    const response = await api.get<AppNotification[]>(
      `/notifications?limit=${limit}`
    );
    return response.data || [];
  } catch (err: any) {
    if (err.response?.status === 404) return [];
    throw err;
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

