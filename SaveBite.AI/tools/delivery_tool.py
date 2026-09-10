import httpx

from langchain_core.tools import tool

from config.settings import settings


def get_headers() -> dict:
    return {
        "X-AI-Service-Key": settings.ai_service_key
    }


@tool
async def get_delivery_request(
    delivery_request_id: str,
) -> dict:
    """
    Retrieve a delivery request.
    """

    url = (
        f"{settings.csharp_api_url}"
        f"/api/internal-ai/delivery/"
        f"{delivery_request_id}"
    )

    try:
        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:

            response = await client.get(
                url,
                headers=get_headers(),
            )

        if response.status_code == 200:
            return {
                "success": True,
                "data": response.json(),
            }

        return {
            "success": False,
            "status_code": response.status_code,
            "error": response.text,
        }

    except httpx.RequestError as exc:
        return {
            "success": False,
            "error": "C# API connection failed.",
            "details": str(exc),
        }


@tool
async def find_nearby_delivery_persons(
    latitude: float,
    longitude: float,
    radius_in_kilometers: float = 10,
    excluded_delivery_person_ids: list[str] | None = None,
) -> dict:
    """
    Find available delivery persons near a location.

    Previously rejected delivery persons can be excluded.
    """

    url = (
        f"{settings.csharp_api_url}"
        "/api/internal-ai/delivery/nearby-persons"
    )

    payload = {
        "latitude": latitude,
        "longitude": longitude,
        "radiusInKilometers": radius_in_kilometers,
        "excludedDeliveryPersonIds":
            excluded_delivery_person_ids or [],
    }

    try:
        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:

            response = await client.post(
                url,
                json=payload,
                headers=get_headers(),
            )

        if response.status_code == 200:

            return {
                "success": True,
                "data": response.json(),
            }

        return {
            "success": False,
            "status_code": response.status_code,
            "error": response.text,
        }

    except httpx.RequestError as exc:

        return {
            "success": False,
            "error": "C# API connection failed.",
            "details": str(exc),
        }


@tool
async def assign_delivery_person(
    delivery_request_id: str,
    delivery_person_id: str,
) -> dict:
    """
    Assign a delivery person to a delivery request.
    """

    url = (
        f"{settings.csharp_api_url}"
        f"/api/internal-ai/delivery/"
        f"{delivery_request_id}/assign"
    )

    payload = {
        "deliveryPersonId":
            delivery_person_id,
    }

    try:
        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:

            response = await client.post(
                url,
                json=payload,
                headers=get_headers(),
            )

        if response.status_code == 200:

            return {
                "success": True,
                "data": response.json(),
            }

        return {
            "success": False,
            "status_code": response.status_code,
            "error": response.text,
        }

    except httpx.RequestError as exc:

        return {
            "success": False,
            "error": "C# API connection failed.",
            "details": str(exc),
        }


@tool
async def calculate_delivery_quote(
    distance_in_kilometers: float,
) -> dict:
    """
    Calculate a temporary SaveBite delivery quote.

    This is a development pricing model. A future version
    can replace this with real provider quotes.
    """

    if distance_in_kilometers < 0:
        return {
            "success": False,
            "error": "Distance cannot be negative.",
        }

    base_fee = 100.0
    per_kilometer = 50.0

    delivery_fee = (
        base_fee
        + (distance_in_kilometers * per_kilometer)
    )

    estimated_minutes = max(
        5,
        int(
            (distance_in_kilometers / 25.0)
            * 60
        ) + 3,
    )

    return {
        "success": True,
        "delivery_fee": round(
            delivery_fee,
            2,
        ),
        "estimated_minutes":
            estimated_minutes,
        "distance_in_kilometers":
            round(
                distance_in_kilometers,
                2,
            ),
        "pricing_model": "development",
    }