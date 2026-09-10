import httpx

from langchain_core.tools import tool

from config.settings import settings


@tool
async def get_food_details(
    food_id: str,
) -> dict:
    """
    Get complete information about a specific
    available surplus food item.
    """

    if not food_id:
        return {
            "success": False,
            "error": "Food ID is required.",
        }

    url = (
        f"{settings.csharp_api_url}"
        f"/api/food-discovery/{food_id}"
    )

    try:
        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:

            response = await client.get(url)

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
async def get_restaurant_details(
    restaurant_id: str,
) -> dict:
    """
    Get detailed information about an approved
    restaurant.
    """

    if not restaurant_id:
        return {
            "success": False,
            "error": "Restaurant ID is required.",
        }

    url = (
        f"{settings.csharp_api_url}"
        f"/api/food-discovery/restaurant/"
        f"{restaurant_id}"
    )

    try:
        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:

            response = await client.get(url)

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