import type { GeoLocation } from "./profile";

export type DeliveryRequestStatus =
  | "Pending"
  | "Searching"
  | "Assigned"
  | "Accepted"
  | "PickedUp"
  | "InTransit"
  | "Delivered"
  | "Cancelled"
  | "Failed";

export interface DeliveryRequestItem {
  id: string;
  orderId: string;
  customerId: string;
  restaurantId: string;
  deliveryPersonId?: string | null;
  pickupLocation: GeoLocation;
  deliveryLocation: GeoLocation;
  distanceInKilometers: number;
  deliveryFee: number;
  estimatedMinutes: number;
  status: DeliveryRequestStatus;
  requestedAt: string;
  assignedAt?: string | null;
  acceptedAt?: string | null;
  completedAt?: string | null;
  updatedAt: string;
  restaurant?: {
    id: string;
    restaurantName: string;
    address: string;
    phoneNumber?: string;
  } | null;
  deliveryAddress?: string;
}

export interface DriverEarningsSummary {
  totalEarnings: number;
  completedCount: number;
  totalDistanceKm: number;
  activeCount: number;
  co2SavedKg: number;
}

export interface DeliveryResponsePayload {
  accept: boolean;
}

export interface UpdateLocationPayload {
  latitude: number;
  longitude: number;
}

export interface DriverTelemetry {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  updatedAt: string;
}

export type GpsTrackingStatus =
  | "idle"
  | "requesting"
  | "broadcasting"
  | "permission_denied"
  | "signal_lost"
  | "network_offline"
  | "simulating";

