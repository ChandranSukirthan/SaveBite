from fastapi import FastAPI
from langchain_core.messages import HumanMessage

from agents.food_matching_agent import (
    build_food_matching_graph,
)


app = FastAPI(
    title="SaveBite AI Service",
    description="Agentic AI service for SaveBite",
    version="1.0.0",
)


food_graph = build_food_matching_graph()


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
Find suitable surplus food for customer {customer_id}.

Customer location:
latitude = {latitude}
longitude = {longitude}

Search radius:
{radius_in_kilometers} km

Requested category:
{category if category else "Any"}

Maximum budget:
{
    f"Rs. {max_price}"
    if max_price is not None
    else "Use customer profile if available"
}

Use the available tools to retrieve the customer's
profile and nearby food, then recommend suitable
options.
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