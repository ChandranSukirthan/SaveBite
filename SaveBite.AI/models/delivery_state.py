from typing import Annotated, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class DeliveryAgentState(TypedDict, total=False):
    order_id: str

    delivery_request_id: str

    customer_id: str

    restaurant_id: str

    pickup_latitude: float

    pickup_longitude: float

    delivery_latitude: float

    delivery_longitude: float

    candidate_drivers: list

    selected_driver: dict

    assignment_result: dict

    excluded_driver_ids: list[str]

    retry_count: int

    max_retries: int

    messages: Annotated[
        list[BaseMessage],
        add_messages,
    ]

    status: str

    message: str
