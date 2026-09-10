export interface DiscoveredFoodItem {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  price: number;
  availableFrom: string;
  availableUntil: string;
  distanceInKilometers: number;
  restaurant: {
    id: string;
    restaurantName: string;
    address: string;
  };
}

export interface FoodSearchFilter {
  latitude: number;
  longitude: number;
  radiusInKilometers: number;
  category?: string;
  maxPrice?: number;
}

export interface CreateCustomerOrderPayload {
  foodItemId: string;
  quantity: number;
  deliveryAddress: string;
  latitude: number;
  longitude: number;
}

export interface AIRecommendation {
  food: DiscoveredFoodItem;
  matchScore: number;
  reason: string;
  badge: string;
}

export interface DiscoveredRestaurantDetails {
  id: string;
  restaurantName: string;
  description?: string;
  address: string;
  phoneNumber?: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  isApproved: boolean;
}

export type FoodSortOption =
  | "distance"
  | "price-asc"
  | "price-desc"
  | "ending-soon"
  | "quantity";

