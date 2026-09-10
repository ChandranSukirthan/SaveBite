from typing import Optional

from fastapi import FastAPI, Header

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
    latitude: float,
    longitude: float,
    radius_in_kilometers: float = 5,
    category: Optional[str] = None,
    max_price: Optional[float] = None,
    authorization: Optional[str] = Header(
        default=None
    ),
):
    access_token = None

    if authorization:
        if authorization.startswith("Bearer "):
            access_token = authorization[
                len("Bearer "):
            ]

    initial_state = {
        "latitude": latitude,
        "longitude": longitude,
        "radius_in_kilometers":
            radius_in_kilometers,
        "category": category,
        "max_price": max_price,
        "access_token": access_token,
    }

    result = await food_graph.ainvoke(
        initial_state
    )

    return {
        "message": result.get(
            "message",
            "Food recommendation completed.",
        ),
        "recommendations": result.get(
            "recommendations",
            [],
        ),
    }