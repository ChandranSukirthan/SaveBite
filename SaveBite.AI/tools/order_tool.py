import httpx

from langchain_core.tools import tool

from config.settings import settings


def get_headers() -> dict:
    return {
        "X-AI-Service-Key": settings.ai_service_key
    }


@tool
async def create_customer_order(
    customer_id: str,
    food_item_id: str,
    quantity: int,
    delivery_address: str,
    latitude: float,
    longitude: float,
) -> dict:
    """
    Create a customer order through the C# backend.

    The C# backend remains responsible for validating
    the customer, food availability, quantity, price,
    and order creation.
    """

    if not customer_id:
        return {
            "success": False,
            "error": "Customer ID is required.",
        }

    if not food_item_id:
        return {
            "success": False,
            "error": "Food item ID is required.",
        }

    if quantity <= 0:
        return {
            "success": False,
            "error": "Quantity must be greater than zero.",
        }

    payload = {
        "foodItemId": food_item_id,
        "quantity": quantity,
        "deliveryAddress": delivery_address,
        "latitude": latitude,
        "longitude": longitude,
    }

    url = (
        f"{settings.csharp_api_url}"
        "/api/internal-ai/orders"
        f"?customerId={customer_id}"
    )

    try:
        async with httpx.AsyncClient(
            timeout=20.0
        ) as client:

            response = await client.post(
                url,
                json=payload,
                headers=get_headers(),
            )

        if response.status_code in (200, 201):

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