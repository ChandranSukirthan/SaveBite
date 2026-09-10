from typing import TypedDict


class DeliveryQuote(TypedDict, total=False):
    delivery_person_id: str

    distance_in_kilometers: float

    delivery_fee: float

    estimated_minutes: int

    vehicle_type: str

    score: float

    reason: str