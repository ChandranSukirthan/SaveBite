export interface GeoLocation {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface CustomerProfile {
  id: string;
  userId: string;
  phoneNumber: string;
  address: string;
  location: GeoLocation;
  preferredCategories: string[];
  maximumBudget: number;
  createdAt: string;
}

export interface CreateCustomerProfileRequest {
  phoneNumber: string;
  address: string;
  latitude: number;
  longitude: number;
  preferredCategories: string[];
  maximumBudget: number;
}

export interface RestaurantProfile {
  id: string;
  ownerId: string;
  restaurantName: string;
  phoneNumber: string;
  address: string;
  description: string;
  location: GeoLocation;
  isApproved: boolean;
  createdAt: string;
}

export interface CreateRestaurantProfileRequest {
  restaurantName: string;
  phoneNumber: string;
  address: string;
  description: string;
  latitude: number;
  longitude: number;
}

export interface DeliveryPersonProfile {
  id: string;
  userId: string;
  phoneNumber: string;
  vehicleType: string;
  vehicleNumber: string;
  location: GeoLocation;
  isAvailable: boolean;
  createdAt: string;
}

export interface CreateDeliveryPersonProfileRequest {
  phoneNumber: string;
  vehicleType: string;
  vehicleNumber: string;
  latitude: number;
  longitude: number;
}
