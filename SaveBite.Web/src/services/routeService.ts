import api from "./api";

export interface RouteWaypoint {
  latitude: number;
  longitude: number;
  stepDescription?: string;
}

export interface AlternativeRouteSummary {
  routeId: string;
  name: string;
  distanceInKilometers: number;
  estimatedMinutes: number;
  trafficCondition: string;
  trafficDelayMinutes: number;
  polyline: string;
  waypoints: RouteWaypoint[];
}

export interface DeliveryRoute {
  id: string;
  orderId: string;
  deliveryRequestId: string;
  routeId: string;
  origin: {
    coordinates: number[];
  };
  destination: {
    coordinates: number[];
  };
  distanceInKilometers: number;
  estimatedMinutes: number;
  trafficCondition: string;
  trafficDelayMinutes: number;
  polyline: string;
  waypoints: RouteWaypoint[];
  alternativeRoutes: AlternativeRouteSummary[];
  selected: boolean;
  selectionReason: string;
  selectionScore: number;
  routeVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface RouteOption {
  routeId: string;
  name: string;
  distanceInKilometers: number;
  normalDurationMinutes: number;
  trafficDurationMinutes: number;
  trafficDelayMinutes: number;
  trafficCondition: string;
  roadDescription: string;
  polyline: string;
  waypoints: RouteWaypoint[];
  historicalAverageMinutes: number;
  historicalDelayMinutes: number;
  reliabilityScore: number;
  calculatedScore?: number;
}

export interface TrafficInfo {
  overallTrafficLevel: string;
  congestionFactor: number;
  averageDelayMinutes: number;
  bottleneckArea: string;
  timestamp: string;
}

export interface DeliveryEta {
  deliveryRequestId: string;
  orderId: string;
  estimatedMinutes: number;
  distanceInKilometers: number;
  trafficCondition: string;
  updatedAt: string;
}

export async function getDeliveryRoute(id: string): Promise<{ deliveryRequestId: string; orderId: string; route: DeliveryRoute }> {
  const res = await api.get(`/api/delivery/${id}/route`);
  return res.data;
}

export async function getRouteOptions(id: string): Promise<{ deliveryRequestId: string; options: RouteOption[] }> {
  const res = await api.get(`/api/delivery/${id}/route/options`);
  return res.data;
}

export async function recalculateDeliveryRoute(
  id: string,
  reason?: string,
  simulateTrafficSpike: boolean = false
): Promise<{ message: string; deliveryRequestId: string; reason: string }> {
  const res = await api.post(`/api/delivery/${id}/route/recalculate`, {
    reason,
    simulateTrafficSpike,
  });
  return res.data;
}

export async function getDeliveryTraffic(id: string): Promise<TrafficInfo> {
  const res = await api.get(`/api/delivery/${id}/traffic`);
  return res.data;
}

export async function getDeliveryEta(id: string): Promise<DeliveryEta> {
  const res = await api.get(`/api/delivery/${id}/eta`);
  return res.data;
}

export async function getDeliveryHistory(id: string): Promise<{ deliveryRequestId: string; historicalAggregations: any[] }> {
  const res = await api.get(`/api/delivery/${id}/history`);
  return res.data;
}

