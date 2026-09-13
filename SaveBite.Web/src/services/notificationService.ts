import api from "./api";
import type { AppNotification, NotificationType } from "../types/restaurant";

export type { AppNotification, NotificationType };

/**
 * Fetch notifications for current authenticated user.
 */
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

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

/**
 * Mark all notifications for current user as read.
 */
export async function markAllNotificationsRead(): Promise<{
  message: string;
  count: number;
}> {
  const response = await api.patch<{ message: string; count: number }>(
    "/notifications/read-all"
  );
  return response.data;
}

/**
 * Returns a recognizable emoji icon for each NotificationType.
 */
export function getNotificationIcon(type: string): string {
  switch (type) {
    case "OrderCreated":
      return "🛒";
    case "OrderConfirmed":
      return "✅";
    case "FoodReady":
      return "🍲";
    case "DriverAssigned":
      return "🚴";
    case "DriverAccepted":
      return "🤝";
    case "DeliveryStarted":
      return "🛵";
    case "DeliveryCompleted":
      return "🏁";
    case "DeliveryRejected":
      return "⚠️";
    case "FoodRecommendation":
      return "✨";
    case "General":
    default:
      return "🔔";
  }
}

/**
 * Returns CSS modifier suffix for notification badge/type styling.
 */
export function getNotificationTypeColor(type: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (type) {
    case "OrderCreated":
      return {
        bg: "rgba(59, 130, 246, 0.12)",
        text: "#60a5fa",
        border: "rgba(59, 130, 246, 0.3)",
      };
    case "OrderConfirmed":
    case "DeliveryCompleted":
      return {
        bg: "rgba(16, 185, 129, 0.12)",
        text: "#10b981",
        border: "rgba(16, 185, 129, 0.3)",
      };
    case "FoodReady":
    case "DriverAssigned":
    case "DriverAccepted":
      return {
        bg: "rgba(245, 197, 24, 0.14)",
        text: "#f5c518",
        border: "rgba(245, 197, 24, 0.35)",
      };
    case "DeliveryStarted":
      return {
        bg: "rgba(168, 85, 247, 0.12)",
        text: "#c084fc",
        border: "rgba(168, 85, 247, 0.3)",
      };
    case "DeliveryRejected":
      return {
        bg: "rgba(239, 68, 68, 0.12)",
        text: "#f87171",
        border: "rgba(239, 68, 68, 0.3)",
      };
    case "FoodRecommendation":
      return {
        bg: "rgba(236, 72, 153, 0.12)",
        text: "#f472b6",
        border: "rgba(236, 72, 153, 0.3)",
      };
    default:
      return {
        bg: "rgba(156, 163, 175, 0.12)",
        text: "#9ca3af",
        border: "rgba(156, 163, 175, 0.3)",
      };
  }
}

/**
 * Resolves the destination deep link for a notification based on user role and orderId.
 */
export function getNotificationDeepLink(
  notif: AppNotification,
  role?: string
): string | null {
  if (notif.orderId) {
    if (role === "Customer") {
      return `/customer/orders/${notif.orderId}/track`;
    }
    if (role === "RestaurantOwner") {
      return `/restaurant/orders`;
    }
    if (role === "DeliveryPerson") {
      return `/delivery/dashboard`;
    }
    return `/customer/orders/${notif.orderId}/track`;
  }

  if (notif.deliveryRequestId && role === "DeliveryPerson") {
    return `/delivery/requests`;
  }

  return null;
}

