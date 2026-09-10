from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage

from agents.delivery_agent import (
    build_delivery_graph,
)
from agents.food_matching_agent import (
    build_food_matching_graph,
)
from agents.order_agent import (
    build_order_graph,
)
from config.settings import settings
from tools.customer_tool import get_customer_profile
from tools.food_tool import search_nearby_food


app = FastAPI(
    title="SaveBite AI Service",
    description="Agentic AI service for SaveBite",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


food_graph = build_food_matching_graph()
delivery_graph = build_delivery_graph()
order_graph = build_order_graph()


def validate_ai_service_key(
    service_key: str | None,
):
    expected_key = settings.ai_service_key

    if not expected_key:
        raise HTTPException(
            status_code=500,
            detail="AI service key is not configured.",
        )

    if service_key != expected_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid AI service key.",
        )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "SaveBite AI Service",
    }


@app.post("/agents/food/recommend")
async def recommend_food(
    customer_id: str,
    latitude: float,
    longitude: float,
    radius_in_kilometers: float = 5,
    category: str | None = None,
    max_price: float | None = None,
):
    customer_request = f"""
Find the best surplus food options for customer
ID: {customer_id}

Customer's current location:

latitude = {latitude}
longitude = {longitude}

Search radius:

{radius_in_kilometers} km

Requested food category:

{category if category else "Any"}

Maximum price:

{
    f"Rs. {max_price}"
    if max_price is not None
    else "Use the customer's saved profile if available"
}

Use your available tools to retrieve current
customer and food information.

Then recommend the most suitable available
surplus food.
"""

    initial_state = {
        "customer_id": customer_id,
        "latitude": latitude,
        "longitude": longitude,
        "radius_in_kilometers": radius_in_kilometers,
        "category": category,
        "max_price": max_price,
        "messages": [
            HumanMessage(
                content=customer_request
            )
        ],
    }

    result = await food_graph.ainvoke(
        initial_state
    )

    messages = result.get(
        "messages",
        [],
    )

    final_message = ""

    if messages:
        final_message = messages[-1].content

    return {
        "message": final_message,
    }


@app.post("/agents/delivery/assign")
async def assign_delivery(
    delivery_request_id: str,
):
    request = f"""
Assign a delivery person to delivery request:

{delivery_request_id}

Find suitable nearby available drivers,
evaluate them, and assign the best available
candidate.

If a driver becomes unavailable, continue with
another suitable candidate.
"""

    initial_state = {
        "delivery_request_id": delivery_request_id,
        "retry_count": 0,
        "max_retries": 3,
        "messages": [
            HumanMessage(
                content=request
            )
        ],
    }

    result = await delivery_graph.ainvoke(
        initial_state
    )

    messages = result.get(
        "messages",
        [],
    )

    final_message = ""

    if messages:
        final_message = messages[-1].content

    return {
        "message": final_message,
    }


@app.post("/agents/delivery/optimize")
async def optimize_delivery(
    delivery_request_id: str,
    x_ai_service_key: str | None = Header(
        default=None
    ),
):
    validate_ai_service_key(
        x_ai_service_key
    )

    request = f"""
Optimize delivery assignment for:

Delivery request:
{delivery_request_id}

Find available nearby delivery persons,
calculate suitable delivery options,
compare distance, estimated delivery time,
vehicle information, and delivery cost.

Select and assign the best available
delivery person.
"""

    initial_state = {
        "delivery_request_id": delivery_request_id,
        "excluded_driver_ids": [],
        "retry_count": 0,
        "max_retries": 3,
        "messages": [
            HumanMessage(
                content=request
            )
        ],
    }

    result = await delivery_graph.ainvoke(
        initial_state
    )

    messages = result.get(
        "messages",
        [],
    )

    final_message = ""

    if messages:
        final_message = messages[-1].content

    return {
        "message": final_message,
    }


@app.post("/agents/delivery/retry")
async def retry_delivery(
    delivery_request_id: str,
    rejected_driver_id: str | None = None,
    x_ai_service_key: str | None = Header(
        default=None
    ),
):
    validate_ai_service_key(
        x_ai_service_key
    )

    excluded_driver_ids = []

    if rejected_driver_id:
        excluded_driver_ids.append(
            rejected_driver_id
        )

    request = f"""
Retry delivery assignment for:

Delivery request:
{delivery_request_id}

Previously rejected driver:
{rejected_driver_id or "None"}

Do not select the previously rejected driver.

Find another available driver and assign the
best suitable candidate.
"""

    initial_state = {
        "delivery_request_id": delivery_request_id,
        "excluded_driver_ids": excluded_driver_ids,
        "retry_count": 1,
        "max_retries": 3,
        "messages": [
            HumanMessage(
                content=request
            )
        ],
    }

    result = await delivery_graph.ainvoke(
        initial_state
    )

    messages = result.get(
        "messages",
        [],
    )

    final_message = ""

    if messages:
        final_message = messages[-1].content

    return {
        "message": final_message,
    }


@app.post("/agents/order/create")
async def create_order(
    customer_id: str,
    food_item_id: str,
    quantity: int,
    delivery_address: str,
    latitude: float,
    longitude: float,
):
    request = f"""
The customer has explicitly selected the following
surplus food:

Customer ID:
{customer_id}

Food Item ID:
{food_item_id}

Quantity:
{quantity}

Delivery Address:
{delivery_address}

Customer Location:
latitude = {latitude}
longitude = {longitude}

Create the order using the available order tool.

Do not modify the food item or quantity.
"""

    initial_state = {
        "customer_id": customer_id,
        "latitude": latitude,
        "longitude": longitude,
        "messages": [
            HumanMessage(
                content=request
            )
        ],
    }

    result = await order_graph.ainvoke(
        initial_state
    )

    messages = result.get(
        "messages",
        [],
    )

    final_message = ""

    if messages:
        final_message = messages[-1].content

    return {
        "message": final_message,
    }