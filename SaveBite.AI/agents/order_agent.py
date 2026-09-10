from langchain_core.messages import SystemMessage

from langgraph.graph import (
    END,
    START,
    StateGraph,
)

from langgraph.prebuilt import ToolNode

from langchain_google_genai import ChatGoogleGenerativeAI

from models.food_state import FoodAgentState

from services.llm_service import get_llm

from tools.order_tool import create_customer_order


SYSTEM_PROMPT = """
You are the SaveBite Order Agent.

Your job is to create an order after a customer
has explicitly selected a food item.

Available tool:

create_customer_order

Important rules:

- Only create an order for the food explicitly selected
  by the customer.
- Never invent a food ID.
- Never change the quantity without the customer's input.
- Never calculate the final food price yourself.
- The C# backend is responsible for validating
  availability and calculating the order price.
- If the order creation tool returns an error,
  explain the error clearly.
"""


tools = [
    create_customer_order,
]


def create_order_llm():

    llm = get_llm()

    return llm.bind_tools(tools)


async def order_agent_node(
    state: FoodAgentState,
) -> FoodAgentState:

    llm = create_order_llm()

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

    elif not isinstance(
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


def build_order_graph():

    graph = StateGraph(
        FoodAgentState
    )

    graph.add_node(
        "agent",
        order_agent_node,
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