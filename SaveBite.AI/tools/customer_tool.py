import httpx

from langchain_core.tools import tool

from config.settings import settings


@tool
async def get_customer_profile(
    customer_id: str,
) -> dict:
    """
    Get customer preferences and profile data
    through the protected internal C# API.
    """

    if not customer_id:
        return {
            "success": False,
            "error": "Customer ID is required.",
        }

    url = (
        f"{settings.csharp_api_url}"
        f"/api/internal-ai/customers/{customer_id}"
    )

    headers = {
        "X-AI-Service-Key":
            settings.ai_service_key
    }

    try:
        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:

            response = await client.get(
                url,
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