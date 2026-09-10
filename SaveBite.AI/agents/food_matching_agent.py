from models.food_state import FoodAgentState
from tools.food_tool import search_nearby_food
from langgraph.graph import StateGraph, START, END


async def search_food_node(
    state: FoodAgentState,
) -> FoodAgentState:
    """
    Search nearby available surplus food
    using the C# backend.
    """

    result = await search_nearby_food(
        latitude=state["latitude"],
        longitude=state["longitude"],
        radius_in_kilometers=state.get(
            "radius_in_kilometers",
            5,
        ),
        category=state.get("category"),
        max_price=state.get("max_price"),
        access_token=state.get("access_token"),
    )

    if not result.get("success"):
        return {
            "available_food": [],
            "recommendations": [],
            "message": (
                "Unable to search nearby food."
            ),
        }

    food = result.get("data", [])

    return {
        "available_food": food,
        "message": (
            f"Found {len(food)} available "
            "food option(s)."
        ),
    }


async def rank_food_node(
    state: FoodAgentState,
) -> FoodAgentState:
    """
    Rank food based on simple business rules.

    AI/LLM ranking will be added later.
    """

    food_items = state.get(
        "available_food",
        [],
    )

    max_price = state.get("max_price")

    ranked = []

    for food in food_items:

        distance = food.get(
            "distanceInKilometers",
            999999,
        )

        price = food.get(
            "price",
            999999,
        )

        quantity = food.get(
            "quantity",
            0,
        )

        score = 0.0

        # Closer food gets higher score.
        if distance <= 1:
            score += 40
        elif distance <= 3:
            score += 30
        elif distance <= 5:
            score += 20
        else:
            score += 10

        # Lower price gets higher score.
        if max_price is not None and max_price > 0:

            price_ratio = price / max_price

            if price_ratio <= 0.5:
                score += 30
            elif price_ratio <= 0.75:
                score += 20
            elif price_ratio <= 1:
                score += 10

        else:

            if price <= 300:
                score += 25
            elif price <= 500:
                score += 15
            else:
                score += 5

        # Available quantity contributes to score.
        if quantity >= 5:
            score += 10
        elif quantity > 0:
            score += 5

        food_with_score = {
            **food,
            "matchScore": round(score, 2),
        }

        ranked.append(food_with_score)

    ranked.sort(
        key=lambda item: item["matchScore"],
        reverse=True,
    )

    return {
        "recommendations": ranked[:5],
    }


def build_food_matching_graph():
    graph = StateGraph(FoodAgentState)

    graph.add_node(
        "search_food",
        search_food_node,
    )

    graph.add_node(
        "rank_food",
        rank_food_node,
    )

    graph.add_edge(
        START,
        "search_food",
    )

    graph.add_edge(
        "search_food",
        "rank_food",
    )

    graph.add_edge(
        "rank_food",
        END,
    )

    return graph.compile()