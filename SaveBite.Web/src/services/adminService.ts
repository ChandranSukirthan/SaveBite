import api from "./api";

export interface GeoLocation {
  type?: string;
  coordinates: [number, number];
}

export interface AdminKPIs {
  users: {
    total: number;
    customers: number;
    restaurants: number;
    deliveryPersons: number;
    admins: number;
  };
  restaurants: {
    total: number;
    approved: number;
    pending: number;
  };
  orders: {
    total: number;
    pending: number;
    active: number;
    delivered: number;
    cancelled: number;
  };
  deliveries: {
    total: number;
    active: number;
    completed: number;
  };
  food: {
    total: number;
    available: number;
    rescuedMeals: number;
  };
  finance: {
    totalGMV: number;
  };
  ai: {
    totalDispatches: number;
    successfulMatches: number;
    successRate: number;
  };
}

export interface AdminRestaurant {
  id: string;
  ownerId: string;
  restaurantName: string;
  address: string;
  phoneNumber: string;
  location: GeoLocation;
  isApproved: boolean;
  createdAt: string;
  ownerFullName: string;
  ownerEmail: string;
  foodCount?: number;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: "Customer" | "RestaurantOwner" | "DeliveryPerson" | "Admin";
  isActive: boolean;
  createdAt: string;
  phoneNumber?: string;
}

export interface AdminOrder {
  id: string;
  customerId: string;
  restaurantId: string;
  foodItemId: string;
  quantity: number;
  totalPrice: number;
  status: string;
  deliveryAddress: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerEmail: string;
  restaurantName: string;
  foodName: string;
  foodCategory: string;
}

export interface AdminDelivery {
  id: string;
  orderId: string;
  customerId: string;
  restaurantId: string;
  deliveryPersonId?: string;
  pickupLocation: GeoLocation;
  deliveryLocation: GeoLocation;
  distanceInKilometers: number;
  deliveryFee: number;
  estimatedMinutes: number;
  status: string;
  requestedAt: string;
  assignedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  updatedAt?: string;
  restaurantName: string;
  restaurantAddress: string;
  courierName: string;
  courierPhone: string;
  courierVehicle: string;
}

export interface AdminAIActivity {
  id: string;
  orderId: string;
  status: string;
  distanceInKilometers: number;
  deliveryFee: number;
  estimatedMinutes: number;
  requestedAt: string;
  updatedAt: string;
  restaurantName: string;
  selectedCourier: string;
  vehicleType: string;
  decisionRationale: string;
  candidateScore: number;
}

/**
 * Fetch platform-wide KPIs
 */
export async function getAdminKPIs(): Promise<AdminKPIs> {
  const response = await api.get<AdminKPIs>("/api/Admin/stats");
  return response.data;
}

/**
 * Fetch pending restaurants awaiting verification
 */
export async function getPendingRestaurants(): Promise<AdminRestaurant[]> {
  const response = await api.get<AdminRestaurant[]>("/api/Admin/restaurants/pending");
  return response.data;
}

/**
 * Fetch all registered restaurants with status filter
 */
export async function getAllRestaurants(status?: string): Promise<AdminRestaurant[]> {
  const params: Record<string, string> = {};
  if (status && status !== "all") {
    params.status = status;
  }
  const response = await api.get<AdminRestaurant[]>("/api/Admin/restaurants", { params });
  return response.data;
}

/**
 * Approve a pending restaurant
 */
export async function approveRestaurant(id: string): Promise<{ message: string; restaurantId: string }> {
  const response = await api.patch<{ message: string; restaurantId: string }>(`/api/Admin/restaurants/${id}/approve`);
  return response.data;
}

/**
 * Reject a restaurant profile
 */
export async function rejectRestaurant(id: string): Promise<{ message: string; restaurantId: string }> {
  const response = await api.patch<{ message: string; restaurantId: string }>(`/api/Admin/restaurants/${id}/reject`);
  return response.data;
}

/**
 * Fetch users with optional role and search query
 */
export async function getAdminUsers(role?: string, search?: string): Promise<AdminUser[]> {
  const params: Record<string, string> = {};
  if (role && role !== "all") {
    params.role = role;
  }
  if (search && search.trim()) {
    params.search = search.trim();
  }
  const response = await api.get<AdminUser[]>("/api/Admin/users", { params });
  return response.data;
}

/**
 * Fetch all orders with optional status filter and search query
 */
export async function getAdminOrders(status?: string, search?: string): Promise<AdminOrder[]> {
  const params: Record<string, string> = {};
  if (status && status !== "all") {
    params.status = status;
  }
  if (search && search.trim()) {
    params.search = search.trim();
  }
  const response = await api.get<AdminOrder[]>("/api/Admin/orders", { params });
  return response.data;
}

/**
 * Fetch all delivery dispatches across the platform
 */
export async function getAdminDeliveries(status?: string): Promise<AdminDelivery[]> {
  const params: Record<string, string> = {};
  if (status && status !== "all") {
    params.status = status;
  }
  const response = await api.get<AdminDelivery[]>("/api/Admin/deliveries", { params });
  return response.data;
}

/**
 * Fetch AI autonomous agent dispatch logs & metrics
 */
export async function getAdminAIActivity(): Promise<AdminAIActivity[]> {
  const response = await api.get<AdminAIActivity[]>("/api/Admin/ai-activity");
  return response.data;
}

/**
 * Re-trigger AI optimization for a delivery request
 */
export async function retryAIOptimization(deliveryRequestId: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/api/Delivery/${deliveryRequestId}/auto-assign`);
  return response.data;
}
