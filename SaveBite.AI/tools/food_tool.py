import httpx

from langchain_core.tools import tool

from config.settings import settings


@tool
async def search_nearby_food(
    latitude: float,
    longitude: float,
    radius_in_kilometers: float = 5,
    category: str | None = None,
    max_price: float | None = None,
) -> dict:
    """
    Search currently available surplus food
    through the C# backend.
    """

    url = (
        f"{settings.csharp_api_url}"
        "/api/internal-ai/food/search"
    )

    payload = {
        "latitude": latitude,
        "longitude": longitude,
        "radiusInKilometers": radius_in_kilometers,
        "category": category,
        "maxPrice": max_price,
    }

    headers = {
        "X-AI-Service-Key":
            settings.ai_service_key
    }

    try:
        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:

            response = await client.post(
                url,
                json=payload,
                headers=headers,
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