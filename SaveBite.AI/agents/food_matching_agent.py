from langchain_core.messages import (
    HumanMessage,
    SystemMessage,
)

from langgraph.graph import (
    END,
    START,
    StateGraph,
)

from langgraph.prebuilt import ToolNode

from models.food_state import FoodAgentState

from services.llm_service import get_llm

from tools.customer_tool import get_customer_profile

from tools.food_tool import search_nearby_food


SYSTEM_PROMPT = """
You are the SaveBite Food Matching Agent.

Your objective is to help customers find suitable
surplus food while helping restaurants reduce food waste.

Available tools:

1. get_customer_profile
   Use this to retrieve the customer's saved
   preferences, budget, and location.

2. search_nearby_food
   Use this to retrieve currently available
   surplus food near a location.

Your workflow should be:

1. Understand the customer's request.
2. Retrieve the customer's profile when a
   customer ID is available.
3. Determine the customer's preferences,
   budget, and location.
4. Search for nearby available surplus food.
5. Compare the available options.
6. Recommend the most suitable food.

Consider:

- Food category preference
- Maximum budget
- Distance
- Quantity
- Availability
- Remaining availability time
- Food waste reduction

Rules:

- Never invent food.
- Never invent a restaurant.
- Only recommend food returned by tools.
- Never recommend food above the customer's
  maximum budget when a budget is available.
- Prefer closer options when other factors
  are similar.
- Prefer food that is approaching its
  availability deadline when appropriate.
- Do not expose internal IDs unnecessarily.
- Explain briefly why each recommended item
  is suitable.
"""


def create_agent_llm():

    llm = get_llm()

    tools = [
        get_customer_profile,
        search_nearby_food,
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

    response = await llm.ainvoke(
        messages
    )

    return {
        "messages": [response]
    }


tools = [
    get_customer_profile,
    search_nearby_food,
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