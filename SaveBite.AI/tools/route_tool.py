import httpx
from langchain_core.tools import tool
from config.settings import settings


def get_headers():
    headers = {"Content-Type": "application/json"}
    service_key = settings.ai_service_key or "savebite-internal-ai-development-key"
    headers["X-AI-Service-Key"] = service_key
    return headers


@tool
async def get_delivery_state(delivery_request_id: str) -> dict:
    """
    Retrieve the current delivery request state, order info, pickup and destination coordinates.
    """
    url = f"{settings.csharp_api_url}/api/internal-ai/delivery/{delivery_request_id}/route-state"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=get_headers())
            if res.status_code == 200:
                return {"success": True, "data": res.json()}
            return {"success": False, "status_code": res.status_code, "error": res.text}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


@tool
async def get_driver_location(delivery_request_id: str) -> dict:
    """
    Retrieve the delivery partner's latest verified GPS position and heading.
    """
    url = f"{settings.csharp_api_url}/api/internal-ai/delivery/{delivery_request_id}/driver-location"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=get_headers())
            if res.status_code == 200:
                return {"success": True, "data": res.json()}
            return {"success": False, "status_code": res.status_code, "error": res.text}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


@tool
async def get_route_options(
    origin_latitude: float,
    origin_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
    simulate_congestion_on_route_a: bool = False,
) -> dict:
    """
    Call the configured map routing provider to retrieve multiple verified candidate routes.
    """
    url = f"{settings.csharp_api_url}/api/internal-ai/delivery/route-options"
    payload = {
        "originLatitude": origin_latitude,
        "originLongitude": origin_longitude,
        "destinationLatitude": destination_latitude,
        "destinationLongitude": destination_longitude,
        "simulateCongestionOnRouteA": simulate_congestion_on_route_a,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload, headers=get_headers())
            if res.status_code == 200:
                return {"success": True, "data": res.json()}
            return {"success": False, "status_code": res.status_code, "error": res.text}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


@tool
async def get_current_traffic(
    origin_latitude: float,
    origin_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
) -> dict:
    """
    Retrieve real-time traffic conditions, delay factor, and congestion levels along the corridor.
    """
    url = f"{settings.csharp_api_url}/api/internal-ai/delivery/traffic"
    payload = {
        "originLatitude": origin_latitude,
        "originLongitude": origin_longitude,
        "destinationLatitude": destination_latitude,
        "destinationLongitude": destination_longitude,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload, headers=get_headers())
            if res.status_code == 200:
                return {"success": True, "data": res.json()}
            return {"success": False, "status_code": res.status_code, "error": res.text}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


@tool
async def get_historical_route_data(
    origin_latitude: float,
    origin_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
) -> dict:
    """
    Retrieve aggregated historical SaveBite delivery performance metrics for each route candidate.
    """
    url = f"{settings.csharp_api_url}/api/internal-ai/delivery/historical-routes"
    payload = {
        "originLatitude": origin_latitude,
        "originLongitude": origin_longitude,
        "destinationLatitude": destination_latitude,
        "destinationLongitude": destination_longitude,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload, headers=get_headers())
            if res.status_code == 200:
                return {"success": True, "data": res.json()}
            return {"success": False, "status_code": res.status_code, "error": res.text}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def calculate_route_score(
    distance_km: float,
    duration_min: float,
    traffic_delay_min: float,
    historical_delay_min: float,
    reliability_score: float,
) -> float:
    """
    Deterministic scoring calculation for candidate routes.
    Score ranges from 0 to 100 (higher is better).
    Primary objective: reliable arrival time.
    """
    # Travel time component: base 40 pts, deducted for excessive duration
    time_score = max(0.0, 40.0 - (duration_min * 1.5))

    # Traffic penalty: 25 pts base, penalize heavy delay
    traffic_score = max(0.0, 25.0 - (traffic_delay_min * 1.8))

    # Reliability component: 25 pts based on historical success rate
    rel_score = reliability_score * 25.0

    # Distance component: 10 pts, slightly prefer shorter when times are equal
    dist_score = max(0.0, 10.0 - (distance_km * 0.8))

    total = time_score + traffic_score + rel_score + dist_score
    return round(total, 2)


@tool
async def save_selected_route(
    order_id: str,
    delivery_request_id: str,
    route_id: str,
    distance_km: float,
    estimated_minutes: int,
    traffic_condition: str,
    traffic_delay_minutes: float,
    polyline: str,
    waypoints: list,
    alternative_routes: list,
    reason: str,
    selection_score: float,
    route_version: int = 1,
) -> dict:
    """
    Save the selected optimal route into MongoDB and trigger real-time SignalR broadcasts to customer and driver.
    """
    url = f"{settings.csharp_api_url}/api/internal-ai/delivery/save-route"
    payload = {
        "orderId": order_id,
        "deliveryRequestId": delivery_request_id,
        "routeId": route_id,
        "distanceInKilometers": distance_km,
        "estimatedMinutes": estimated_minutes,
        "trafficCondition": traffic_condition,
        "trafficDelayMinutes": traffic_delay_minutes,
        "polyline": polyline,
        "waypoints": waypoints,
        "alternativeRoutes": alternative_routes,
        "reason": reason,
        "selectionScore": selection_score,
        "routeVersion": route_version,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload, headers=get_headers())
            if res.status_code == 200:
                return {"success": True, "data": res.json()}
            return {"success": False, "status_code": res.status_code, "error": res.text}
    except Exception as exc:
        return {"success": False, "error": str(exc)}

