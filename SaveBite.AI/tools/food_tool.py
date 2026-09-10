import httpx

from config.settings import settings


async def search_nearby_food(
    latitude: float,
    longitude: float,
    radius_in_kilometers: float = 5,
    category: str | None = None,
    max_price: float | None = None,
    access_token: str | None = None,
) -> dict:
    """
    Search available surplus food through the C# API.

    The AI service never accesses MongoDB directly.
    """

    url = (
        f"{settings.csharp_api_url}"
        "/api/food-discovery/search"
    )

    payload = {
        "latitude": latitude,
        "longitude": longitude,
        "radiusInKilometers": radius_in_kilometers,
        "category": category,
        "maxPrice": max_price,
    }

    headers = {}

    if access_token:
        headers["Authorization"] = (
            f"Bearer {access_token}"
        )

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