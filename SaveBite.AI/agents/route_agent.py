import json
import re
import datetime
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END

from models.route_state import RouteAgentState
from services.llm_service import get_llm
from tools.route_tool import (
    get_delivery_state,
    get_driver_location,
    get_route_options,
    get_current_traffic,
    get_historical_route_data,
    calculate_route_score,
    save_selected_route,
)

SYSTEM_PROMPT = """You are the SaveBite Autonomous Route Optimization Agent.

Your objective is to evaluate verified candidate delivery routes and select the optimal route for the courier.

PRIMARY GOAL: Minimize reliable arrival time.
SECONDARY GOALS:
- Avoid severe traffic congestion and bottlenecks.
- Avoid historically unreliable routes with high variance.
- Slightly prefer shorter distance when expected travel times are similar.
- Do NOT blindly choose the shortest distance if it has severe traffic delays.

RULES:
1. You may ONLY choose a route from the verified candidate routes provided.
2. Never invent route IDs, coordinates, distances, or ETAs.
3. Return your decision as a valid JSON object matching this schema:
{
  "selectedRouteId": "route-B",
  "reason": "Clear explanation of why this route is superior based on traffic and historical reliability.",
  "confidence": 0.95
}
"""


async def observe_delivery(state: RouteAgentState) -> RouteAgentState:
    req_id = state.get("delivery_request_id", "")
    res = await get_delivery_state.ainvoke({"delivery_request_id": req_id})
    if res.get("success"):
        data = res["data"]
        return {
            "order_id": data.get("orderId", ""),
            "pickup_latitude": data.get("pickupLatitude", 40.7128),
            "pickup_longitude": data.get("pickupLongitude", -74.0060),
            "destination_latitude": data.get("destinationLatitude", 40.7484),
            "destination_longitude": data.get("destinationLongitude", -73.9857),
            "driver_latitude": data.get("driverLatitude", 40.7128),
            "driver_longitude": data.get("driverLongitude", -74.0060),
            "status": "Delivery observed",
        }
    return {"status": "Observation failed; using default locations"}


async def node_driver_location(state: RouteAgentState) -> RouteAgentState:
    req_id = state.get("delivery_request_id", "")
    res = await get_driver_location.ainvoke({"delivery_request_id": req_id})
    if res.get("success"):
        data = res["data"]
        return {
            "driver_latitude": data.get("latitude", state.get("driver_latitude", 40.7128)),
            "driver_longitude": data.get("longitude", state.get("driver_longitude", -74.0060)),
            "status": "Driver GPS acquired",
        }
    return {"status": "Driver GPS query complete"}


async def node_get_routes(state: RouteAgentState) -> RouteAgentState:
    o_lat = state.get("driver_latitude") or state.get("pickup_latitude", 40.7128)
    o_lon = state.get("driver_longitude") or state.get("pickup_longitude", -74.0060)
    d_lat = state.get("destination_latitude", 40.7484)
    d_lon = state.get("destination_longitude", -73.9857)
    simulate_spike = state.get("simulate_traffic_spike", False)

    res = await get_route_options.ainvoke({
        "origin_latitude": o_lat,
        "origin_longitude": o_lon,
        "destination_latitude": d_lat,
        "destination_longitude": d_lon,
        "simulate_congestion_on_route_a": simulate_spike,
    })

    routes = []
    if res.get("success"):
        routes = res["data"].get("routes", [])

    return {
        "candidate_routes": routes,
        "status": f"{len(routes)} verified candidate routes retrieved",
    }


async def node_get_traffic(state: RouteAgentState) -> RouteAgentState:
    o_lat = state.get("driver_latitude") or state.get("pickup_latitude", 40.7128)
    o_lon = state.get("driver_longitude") or state.get("pickup_longitude", -74.0060)
    d_lat = state.get("destination_latitude", 40.7484)
    d_lon = state.get("destination_longitude", -73.9857)

    res = await get_current_traffic.ainvoke({
        "origin_latitude": o_lat,
        "origin_longitude": o_lon,
        "destination_latitude": d_lat,
        "destination_longitude": d_lon,
    })

    traffic = res.get("data", {}) if res.get("success") else {}
    return {
        "traffic_information": traffic,
        "status": "Traffic conditions analyzed",
    }


async def node_get_historical(state: RouteAgentState) -> RouteAgentState:
    o_lat = state.get("driver_latitude") or state.get("pickup_latitude", 40.7128)
    o_lon = state.get("driver_longitude") or state.get("pickup_longitude", -74.0060)
    d_lat = state.get("destination_latitude", 40.7484)
    d_lon = state.get("destination_longitude", -73.9857)

    res = await get_historical_route_data.ainvoke({
        "origin_latitude": o_lat,
        "origin_longitude": o_lon,
        "destination_latitude": d_lat,
        "destination_longitude": d_lon,
    })

    histories = []
    if res.get("success"):
        histories = res["data"].get("historicalRoutes", [])

    # Merge historical stats into candidate routes
    candidates = list(state.get("candidate_routes", []))
    history_map = {h["routeId"]: h for h in histories}
    for c in candidates:
        r_id = c["routeId"]
        if r_id in history_map:
            c["historicalAverageMinutes"] = history_map[r_id]["historicalAverageMinutes"]
            c["historicalDelayMinutes"] = history_map[r_id]["historicalDelayMinutes"]
            c["reliabilityScore"] = history_map[r_id]["successfulDeliveryRate"]

    return {
        "historical_route_data": histories,
        "candidate_routes": candidates,
        "status": "Historical delivery performance incorporated",
    }


async def node_score_routes(state: RouteAgentState) -> RouteAgentState:
    candidates = list(state.get("candidate_routes", []))
    for c in candidates:
        score = calculate_route_score(
            distance_km=c.get("distanceInKilometers", 3.0),
            duration_min=c.get("trafficDurationMinutes", 15),
            traffic_delay_min=c.get("trafficDelayMinutes", 2.0),
            historical_delay_min=c.get("historicalDelayMinutes", 1.0),
            reliability_score=c.get("reliabilityScore", 0.95),
        )
        c["calculatedScore"] = score

    candidates.sort(key=lambda x: x["calculatedScore"], reverse=True)
    return {
        "candidate_routes": candidates,
        "status": "Routes scored deterministically",
    }


async def node_ai_select(state: RouteAgentState) -> RouteAgentState:
    candidates = state.get("candidate_routes", [])
    if not candidates:
        return {"status": "No candidate routes to evaluate"}

    # Format candidates overview for Gemini reasoning
    summary_lines = []
    for c in candidates:
        summary_lines.append(
            f"- {c['routeId']} ('{c['name']}'): distance={c['distanceInKilometers']} km, "
            f"normal_duration={c['normalDurationMinutes']} min, traffic_duration={c['trafficDurationMinutes']} min, "
            f"traffic_delay=+{c['trafficDelayMinutes']} min ({c['trafficCondition']}), "
            f"historical_reliability={int(c.get('reliabilityScore', 0.9)*100)}%, score={c.get('calculatedScore')}"
        )

    user_prompt = (
        f"Order ID: {state.get('order_id')}\n"
        f"Traffic Overview: {state.get('traffic_information', {}).get('overallTrafficLevel', 'Moderate')}\n\n"
        f"Verified Route Alternatives:\n" + "\n".join(summary_lines) + "\n\n"
        f"Select the best overall route for fast, reliable delivery and return valid JSON with selectedRouteId, reason, confidence."
    )

    selected_id = candidates[0]["routeId"]
    reason = f"Selected {candidates[0]['name']} based on optimal combination of travel time and reliability."
    confidence = 0.92

    try:
        llm = get_llm()
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ]
        res = await llm.ainvoke(messages)
        text = res.content.strip()

        # Extract JSON from response
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            parsed = json.loads(match.group(0))
            if "selectedRouteId" in parsed:
                selected_id = parsed["selectedRouteId"]
                reason = parsed.get("reason", reason)
                confidence = float(parsed.get("confidence", 0.92))
    except Exception as exc:
        print("[RouteAgent LLM notice - falling back to deterministic best]:", exc)
        if candidates:
            selected_id = candidates[0]["routeId"]
            reason = (
                f"Selected {candidates[0]['name']} ({candidates[0]['trafficDurationMinutes']} mins, "
                f"{candidates[0]['distanceInKilometers']} km) with lowest overall congestion delay."
            )

    return {
        "selected_route_reason": reason,
        "selected_route_score": confidence,
        "status": f"AI selected {selected_id}",
        "messages": [HumanMessage(content=f"Decision: {selected_id} - {reason}")],
    }


async def node_validate(state: RouteAgentState) -> RouteAgentState:
    candidates = state.get("candidate_routes", [])
    reason = state.get("selected_route_reason", "")

    # Identify matching route or fallback to top scored
    selected = None
    for c in candidates:
        if c["routeId"] in reason or (state.get("messages") and c["routeId"] in state["messages"][-1].content):
            selected = c
            break

    if not selected and candidates:
        selected = candidates[0]

    if selected:
        return {
            "selected_route": selected,
            "current_eta": selected.get("trafficDurationMinutes", 15),
            "current_distance": selected.get("distanceInKilometers", 3.5),
            "status": f"Route {selected['routeId']} validated successfully",
        }

    return {"status": "Route validation completed"}


async def node_save(state: RouteAgentState) -> RouteAgentState:
    selected = state.get("selected_route")
    if not selected:
        return {"status": "No route to save"}

    order_id = state.get("order_id", "")
    req_id = state.get("delivery_request_id", "")
    candidates = state.get("candidate_routes", [])
    alt_routes = [c for c in candidates if c["routeId"] != selected["routeId"]]

    current_ver = state.get("route_version", 0) + 1

    save_res = await save_selected_route.ainvoke({
        "order_id": order_id,
        "delivery_request_id": req_id,
        "route_id": selected["routeId"],
        "distance_km": selected["distanceInKilometers"],
        "estimated_minutes": selected["trafficDurationMinutes"],
        "traffic_condition": selected["trafficCondition"],
        "traffic_delay_minutes": selected["trafficDelayMinutes"],
        "polyline": selected["polyline"],
        "waypoints": selected.get("waypoints", []),
        "alternative_routes": alt_routes,
        "reason": state.get("selected_route_reason", ""),
        "selection_score": selected.get("calculatedScore", 90.0),
        "route_version": current_ver,
    })

    return {
        "route_version": current_ver,
        "last_recalculation_time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": f"Route version {current_ver} saved to MongoDB and broadcast",
    }


async def node_broadcast(state: RouteAgentState) -> RouteAgentState:
    # Broadcasting is triggered automatically through C# SaveRoute and SignalR
    return {
        "status": "Route successfully synchronized to customer and driver maps",
    }


# Assemble LangGraph Workflow
builder = StateGraph(RouteAgentState)

builder.add_node("observe_delivery", observe_delivery)
builder.add_node("get_driver_location", node_driver_location)
builder.add_node("get_routes", node_get_routes)
builder.add_node("get_traffic", node_get_traffic)
builder.add_node("get_historical_data", node_get_historical)
builder.add_node("score_routes", node_score_routes)
builder.add_node("ai_select_route", node_ai_select)
builder.add_node("validate_route", node_validate)
builder.add_node("save_route", node_save)
builder.add_node("broadcast", node_broadcast)

builder.add_edge(START, "observe_delivery")
builder.add_edge("observe_delivery", "get_driver_location")
builder.add_edge("get_driver_location", "get_routes")
builder.add_edge("get_routes", "get_traffic")
builder.add_edge("get_traffic", "get_historical_data")
builder.add_edge("get_historical_data", "score_routes")
builder.add_edge("score_routes", "ai_select_route")
builder.add_edge("ai_select_route", "validate_route")
builder.add_edge("validate_route", "save_route")
builder.add_edge("save_route", "broadcast")
builder.add_edge("broadcast", END)

route_graph = builder.compile()

