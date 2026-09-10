from typing import Annotated, Optional, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class FoodAgentState(TypedDict, total=False):
    customer_id: str

    latitude: float
    longitude: float

    radius_in_kilometers: float

    category: Optional[str]

    max_price: Optional[float]

    customer_profile: dict

    available_food: list

    recommendations: list

    messages: Annotated[
        list[BaseMessage],
        add_messages,
    ]

    message: str