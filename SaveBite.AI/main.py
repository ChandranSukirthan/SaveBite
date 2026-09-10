from fastapi import FastAPI, Header
from typing import Optional

from tools.food_tool import search_nearby_food

app = FastAPI(
    title="SaveBite AI Service",
    description="Agentic AI service for SaveBite",
    version="1.0.0",
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "SaveBite AI Service",
    }


@app.post("/tools/search-food")
async def test_food_search(
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

    return await search_nearby_food(
        latitude=latitude,
        longitude=longitude,
        radius_in_kilometers=radius_in_kilometers,
        category=category,
        max_price=max_price,
        access_token=access_token,
    )