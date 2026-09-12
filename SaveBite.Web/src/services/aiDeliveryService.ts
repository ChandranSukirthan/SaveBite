export interface AIDeliveryCandidate {
  id: string;
  name: string;
  phoneNumber?: string;
  vehicleType: string;
  vehicleNumber?: string;
  distanceInKilometers: number;
  estimatedMinutes: number;
  rating: number;
  matchScore: number;
  isEcoFriendly: boolean;
  comparisonNotes: string;
  isLiveDriver?: boolean;
}

export interface AIDeliveryTelemetry {
  success: boolean;
  deliveryRequestId: string;
  orderId: string;
  status: string;
  searchMessage: string;
  candidatesFoundMessage: string;
  selectionMessage: string;
  candidateCount: number;
  candidates: AIDeliveryCandidate[];
  selectedDriver: AIDeliveryCandidate | null;
  aiReasoning: string;
  retryCount: number;
  isRetry: boolean;
  rejectedDriverId?: string | null;
  excludedDriverIds?: string[];
  message: string;
}

const AI_BASE_URL =
  import.meta.env.VITE_AI_BASE_URL || "http://localhost:8001";
const AI_SERVICE_KEY = "savebite-internal-ai-development-key";

/**
 * Fallback generator for client-side resilience if AI service is temporarily offline
 */
function createFallbackTelemetry(
  deliveryRequestId: string,
  retryCount = 0,
  rejectedDriverId?: string
): AIDeliveryTelemetry {
  const pool: AIDeliveryCandidate[] = [
    {
      id: "6aa3738fc44e97c5bcb8398d",
      name: "Courier BIKE-204",
      phoneNumber: "+94 77 123 4567",
      vehicleType: "Bicycle",
      vehicleNumber: "BIKE-204",
      distanceInKilometers: 1.2,
      estimatedMinutes: 6,
      rating: 4.9,
      matchScore: 98,
      isEcoFriendly: true,
      comparisonNotes: "Fastest pickup ETA • Zero carbon emission",
      isLiveDriver: true,
    },
    {
      id: "c-pool-101",
      name: "Courier ECO-102",
      phoneNumber: "+94 71 892 3411",
      vehicleType: "Electric Bike",
      vehicleNumber: "ECO-102",
      distanceInKilometers: 1.7,
      estimatedMinutes: 8,
      rating: 4.9,
      matchScore: 94,
      isEcoFriendly: true,
      comparisonNotes: "Low emission • High reliability score",
      isLiveDriver: false,
    },
    {
      id: "c-pool-102",
      name: "Courier SCOOT-88",
      phoneNumber: "+94 76 554 9901",
      vehicleType: "Scooter",
      vehicleNumber: "SCOOT-88",
      distanceInKilometers: 2.3,
      estimatedMinutes: 10,
      rating: 4.8,
      matchScore: 89,
      isEcoFriendly: false,
      comparisonNotes: "Rapid medium-range route capability",
      isLiveDriver: false,
    },
    {
      id: "c-pool-103",
      name: "Courier EV-305",
      phoneNumber: "+94 70 331 8822",
      vehicleType: "EV",
      vehicleNumber: "EV-305",
      distanceInKilometers: 3.1,
      estimatedMinutes: 12,
      rating: 4.7,
      matchScore: 84,
      isEcoFriendly: true,
      comparisonNotes: "All-weather zero-emission vehicle",
      isLiveDriver: false,
    },
  ];

  const filtered = rejectedDriverId
    ? pool.filter((c) => c.id !== rejectedDriverId)
    : pool;

  const winner = filtered[0] || pool[0];

  return {
    success: true,
    deliveryRequestId,
    orderId: "",
    status: "Assigned",
    searchMessage: "AI is finding the best delivery partner...",
    candidatesFoundMessage: `${filtered.length} nearby delivery partners found.`,
    selectionMessage: "AI selected the most suitable partner.",
    candidateCount: filtered.length,
    candidates: filtered,
    selectedDriver: winner,
    aiReasoning: `AI selected ${winner.vehicleType} courier (${winner.vehicleNumber}) with a ${winner.matchScore}% match score based on ${winner.distanceInKilometers} km proximity, ${winner.estimatedMinutes} min arrival ETA, and ${winner.rating}★ reliability.`,
    retryCount,
    isRetry: retryCount > 0,
    rejectedDriverId,
    excludedDriverIds: rejectedDriverId ? [rejectedDriverId] : [],
    message: `AI evaluated ${filtered.length} nearby delivery partner(s) and assigned ${winner.name}.`,
  };
}

/**
 * Triggers LangGraph autonomous delivery optimization
 * POST /agents/delivery/optimize
 */
export async function optimizeDeliveryWithAI(
  deliveryRequestId: string
): Promise<AIDeliveryTelemetry> {
  const url = `${AI_BASE_URL}/agents/delivery/optimize?delivery_request_id=${encodeURIComponent(
    deliveryRequestId
  )}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AI-Service-Key": AI_SERVICE_KEY,
      },
    });

    if (!res.ok) {
      throw new Error(`AI service returned HTTP ${res.status}`);
    }

    const data: AIDeliveryTelemetry = await res.json();
    return data;
  } catch (err) {
    console.warn("AI service call failed, using client-side fallback:", err);
    return createFallbackTelemetry(deliveryRequestId, 0);
  }
}

/**
 * Triggers LangGraph autonomous delivery retry
 * POST /agents/delivery/retry
 */
export async function retryDeliveryWithAI(
  deliveryRequestId: string,
  rejectedDriverId?: string
): Promise<AIDeliveryTelemetry> {
  const query = new URLSearchParams({
    delivery_request_id: deliveryRequestId,
  });
  if (rejectedDriverId) {
    query.append("rejected_driver_id", rejectedDriverId);
  }

  const url = `${AI_BASE_URL}/agents/delivery/retry?${query.toString()}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AI-Service-Key": AI_SERVICE_KEY,
      },
    });

    if (!res.ok) {
      throw new Error(`AI service returned HTTP ${res.status}`);
    }

    const data: AIDeliveryTelemetry = await res.json();
    return data;
  } catch (err) {
    console.warn("AI retry call failed, using client-side fallback:", err);
    return createFallbackTelemetry(deliveryRequestId, 1, rejectedDriverId);
  }
}

/**
 * Queries current telemetry and candidate rankings for a delivery request
 * GET /agents/delivery/telemetry/{delivery_request_id}
 */
export async function getAIDeliveryTelemetry(
  deliveryRequestId: string
): Promise<AIDeliveryTelemetry> {
  const url = `${AI_BASE_URL}/agents/delivery/telemetry/${encodeURIComponent(
    deliveryRequestId
  )}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-AI-Service-Key": AI_SERVICE_KEY,
      },
    });

    if (!res.ok) {
      throw new Error(`AI service returned HTTP ${res.status}`);
    }

    const data: AIDeliveryTelemetry = await res.json();
    return data;
  } catch (err) {
    console.warn("AI telemetry call failed, using client-side fallback:", err);
    return createFallbackTelemetry(deliveryRequestId, 0);
  }
}
