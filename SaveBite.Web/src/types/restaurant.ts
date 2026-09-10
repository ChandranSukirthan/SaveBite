export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Preparing"
  | "ReadyForPickup"
  | "PickedUp"
  | "OutForDelivery"
  | "Delivered"
  | "Cancelled"
  | "Failed";

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  foodItemId: string;
  quantity: number;
  unitPrice: number;
  foodTotal: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryAddress: string;
  deliveryRequestId?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export type FoodStatus =
  | "Draft"
  | "Available"
  | "Reserved"
  | "Sold"
  | "Expired"
  | "Cancelled";

export interface FoodLocation {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface FoodItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  price: number;
  availableFrom: string;
  availableUntil: string;
  location?: FoodLocation;
  status: FoodStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFoodPayload {
  name: string;
  description: string;
  category: string;
  quantity: number;
  price: number;
  availableFrom: string;
  availableUntil: string;
  latitude: number;
  longitude: number;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
}

export interface UpdateOrderStatusResponse {
  message: string;
  order?: Order;
}

export type NotificationType =
  | "General"
  | "FoodRecommendation"
  | "OrderCreated"
  | "OrderConfirmed"
  | "FoodReady"
  | "DriverAssigned"
  | "DriverAccepted"
  | "DeliveryStarted"
  | "DeliveryCompleted"
  | "DeliveryRejected";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  orderId?: string;
  deliveryRequestId?: string;
  isRead: boolean;
  createdAt: string;
}
