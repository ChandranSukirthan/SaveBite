from langchain_core.messages import SystemMessage

from langgraph.graph import (
    END,
    START,
    StateGraph,
)

from langgraph.prebuilt import ToolNode

from models.food_state import FoodAgentState

from services.llm_service import get_llm

from tools.customer_tool import (
    get_customer_profile,
)

from tools.food_tool import (
    search_nearby_food,
)

from tools.details_tool import (
    get_food_details,
    get_restaurant_details,
)


SYSTEM_PROMPT = """
You are the SaveBite Food Matching Agent.

Your goal is to help customers discover suitable
surplus food while helping restaurants reduce food waste.

Available tools:

1. get_customer_profile
   Get the customer's saved preferences,
   maximum budget, and location.

2. search_nearby_food
   Search currently available surplus food
   near a location.

3. get_food_details
   Get complete information about one food item.

4. get_restaurant_details
   Get detailed information about one restaurant.

You should use tools when current application
information is needed.

Recommended workflow:

1. Understand the customer's request.
2. Retrieve customer profile when possible.
3. Search nearby food.
4. Identify promising candidates.
5. Inspect food details when necessary.
6. Inspect restaurant details when useful.
7. Compare candidates.
8. Recommend the best options.

Consider:

- Customer food preference
- Maximum budget
- Distance
- Quantity available
- Availability time
- Food freshness/urgency based on availability deadline
- Restaurant information
- Overall suitability

Important rules:

- Never invent food.
- Never invent restaurants.
- Only use information returned by tools.
- Never recommend food above the customer's
  maximum budget when a budget is available.
- Prefer closer food when other factors are similar.
- Consider food approaching its availability
  deadline because reducing food waste is a core
  SaveBite objective.
- Do not expose internal database information
  unnecessarily.
- Give a concise explanation for recommendations.
"""


def create_agent_llm():

    llm = get_llm()

    tools = [
        get_customer_profile,
        search_nearby_food,
        get_food_details,
        get_restaurant_details,
    ]

    return llm.bind_tools(tools)


async def agent_node(
    state: FoodAgentState,
) -> FoodAgentState:

    llm = create_agent_llm()

    messages = state.get(
        "messages",
        [],
    )

    if not messages:

        messages = [
            SystemMessage(
                content=SYSTEM_PROMPT
            )
        ]

    else:

        # Ensure system instructions are always
        # available to the agent.
        if not isinstance(
            messages[0],
            SystemMessage,
        ):
            messages = [
                SystemMessage(
                    content=SYSTEM_PROMPT
                ),
                *messages,
            ]

    response = await llm.ainvoke(
        messages
    )

    return {
        "messages": [response]
    }


tools = [
    get_customer_profile,
    search_nearby_food,
    get_food_details,
    get_restaurant_details,
]

tool_node = ToolNode(tools)


def route_after_agent(
    state: FoodAgentState,
):

    messages = state.get(
        "messages",
        [],
    )

    if not messages:
        return END

    last_message = messages[-1]

    tool_calls = getattr(
        last_message,
        "tool_calls",
        None,
    )

    if tool_calls:
        return "tools"

    return END


def build_food_matching_graph():

    graph = StateGraph(
        FoodAgentState
    )

    graph.add_node(
        "agent",
        agent_node,
    )

    graph.add_node(
        "tools",
        tool_node,
    )

    graph.add_edge(
        START,
        "agent",
    )

    graph.add_conditional_edges(
        "agent",
        route_after_agent,
        {
            "tools": "tools",
            END: END,
        },
    )

    graph.add_edge(
        "tools",
        "agent",
    )

    return graph.compile()