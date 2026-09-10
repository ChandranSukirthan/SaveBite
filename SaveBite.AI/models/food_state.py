from typing import TypedDict, Optional


class FoodAgentState(TypedDict, total=False):
    customer_id: str

    latitude: float
    longitude: float

    radius_in_kilometers: float

    category: Optional[str]
    max_price: Optional[float]

    access_token: Optional[str]

    available_food: list

    recommendations: list

    message: str