from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage


class RouteAgentState(TypedDict, total=False):
    route_request_id: str
    order_id: str
    delivery_request_id: str

    driver_latitude: float
    driver_longitude: float

    pickup_latitude: float
    pickup_longitude: float

    destination_latitude: float
    destination_longitude: float

    candidate_routes: List[Dict[str, Any]]

    traffic_information: Dict[str, Any]

    historical_route_data: List[Dict[str, Any]]

    weather_information: Optional[Dict[str, Any]]

    selected_route: Optional[Dict[str, Any]]

    selected_route_score: float

    selected_route_reason: str

    current_eta: int

    current_distance: float

    route_version: int

    last_recalculation_time: str

    recalculation_count: int

    simulate_traffic_spike: bool

    messages: List[BaseMessage]

    status: str

