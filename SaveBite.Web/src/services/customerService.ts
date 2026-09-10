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

export async function getCustomerOrderById(id: string): Promise<Order> {
  const response = await api.get<Order>(`/Order/${id}`);
  return response.data;
}

export async function cancelCustomerOrder(
  id: string
): Promise<{ message: string }> {
  const response = await api.patch<{ message: string }>(`/Order/${id}/cancel`);
  return response.data;
}

export interface DeliveryEstimateResponse {
  estimate: {
    orderId: string;
    distanceInKilometers: number;
    estimatedDeliveryFee: number;
    foodTotal: number;
    estimatedTotalAmount: number;
    estimatedMinutes: number;
    generatedAt: string;
  };
  restaurant?: {
    id: string;
    name: string;
  };
  pricing?: {
    baseFee: number;
    perKilometer: number;
  };
  note?: string;
}

export async function getCustomerDeliveryEstimate(
  orderId: string
): Promise<DeliveryEstimateResponse> {
  const response = await api.get<DeliveryEstimateResponse>(
    `/customer/delivery-estimate/${orderId}`
  );
  return response.data;
}

export interface AgentRecommendationItem {
  foodId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  quantity: number;
  availableUntil: string;
  distanceInKilometers: number;
  restaurant: {
    id: string;
    restaurantName: string;
    address: string;
  };
  matchScore: number;
  reason: string;
  badge: string;
}

export interface AgentRecommendationResponse {
  message: string;
  recommendations: AgentRecommendationItem[];
}

export async function getAIFoodRecommendations(params: {
  customerId: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  category?: string;
  maxPrice?: number;
}): Promise<AgentRecommendationResponse> {
  const query = new URLSearchParams({
    customer_id: params.customerId,
    latitude: params.latitude.toString(),
    longitude: params.longitude.toString(),
    radius_in_kilometers: (params.radiusKm || 15).toString(),
  });

  if (params.category && params.category !== "All") {
    query.append("category", params.category);
  }
  if (params.maxPrice && params.maxPrice > 0) {
    query.append("max_price", params.maxPrice.toString());
  }

  const aiBaseUrl = import.meta.env.VITE_AI_BASE_URL || "http://localhost:8001";

  try {
    const res = await fetch(`${aiBaseUrl}/agents/food/recommend?${query.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`AI Service returned ${res.status}`);
    }

    const data: AgentRecommendationResponse = await res.json();
    return data;
  } catch (err: any) {
    console.warn("AI service call failed, using client fallback:", err);
    const foods = await searchNearbyFood({
      latitude: params.latitude,
      longitude: params.longitude,
      radiusInKilometers: params.radiusKm || 15,
      category: params.category === "All" ? undefined : params.category,
      maxPrice: params.maxPrice,
    });

    const recs: AgentRecommendationItem[] = foods.map((f, idx) => ({
      foodId: f.id,
      name: f.name,
      description: f.description,
      category: f.category,
      price: f.price,
      quantity: f.quantity,
      availableUntil: f.availableUntil,
      distanceInKilometers: f.distanceInKilometers || 0.1,
      restaurant: {
        id: f.restaurant?.id || "",
        restaurantName: f.restaurant?.restaurantName || "Partner Restaurant",
        address: f.restaurant?.address || "",
      },
      matchScore: Math.max(98 - idx * 4, 75),
      reason: `Matched for ${f.category}. Great rescue price of $${f.price.toFixed(2)} and located only ${f.distanceInKilometers || 0.1} km away.`,
      badge: idx === 0 ? "🎯 Top Match" : "⚡ Surplus Rescue",
    }));

    return {
      message: `Evaluated ${foods.length} surplus meal(s) near your delivery zone.`,
      recommendations: recs,
    };
  }
}

