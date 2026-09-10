import httpx

from langchain_core.tools import tool

from config.settings import settings


@tool
async def get_customer_profile(
    customer_id: str,
) -> dict:
    """
    Get a customer's saved preferences, budget,
    location, and profile information from SaveBite.
    """

    url = (
        f"{settings.csharp_api_url}"
        f"/api/customer/internal/{customer_id}"
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