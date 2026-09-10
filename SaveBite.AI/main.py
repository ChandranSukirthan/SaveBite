from fastapi import FastAPI
from langchain_core.messages import HumanMessage

from agents.delivery_agent import (
    build_delivery_graph,
)
from agents.food_matching_agent import (
    build_food_matching_graph,
)


app = FastAPI(
    title="SaveBite AI Service",
    description="Agentic AI service for SaveBite",
    version="1.0.0",
)


food_graph = build_food_matching_graph()
delivery_graph = build_delivery_graph()


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
):
    request = f"""
Optimize delivery assignment for:

Delivery request:
{delivery_request_id}

Find available nearby delivery persons,
calculate suitable delivery options,
compare distance, estimated delivery time,
vehicle information, and delivery cost.

Select and assign the best available delivery
person.

Do not invent any driver information.
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