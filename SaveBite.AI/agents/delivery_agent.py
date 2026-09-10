from langchain_core.messages import SystemMessage

from langgraph.graph import (
    END,
    START,
    StateGraph,
)

from langgraph.prebuilt import ToolNode

from models.delivery_state import DeliveryAgentState

from services.llm_service import get_llm

from tools.delivery_tool import (
    assign_delivery_person,
    calculate_delivery_quote,
    find_nearby_delivery_persons,
    get_delivery_estimate,
    get_delivery_request,
)


SYSTEM_PROMPT = """
You are the SaveBite Delivery Optimization Agent.

Your objective is to select the best available
delivery person for a food order.

Available tools:

1. get_delivery_request
2. get_delivery_estimate
3. find_nearby_delivery_persons
4. calculate_delivery_quote
5. assign_delivery_person

You should:

1. Retrieve the delivery request.
2. Understand the pickup location.
3. Search nearby available delivery persons.
4. Exclude drivers that have already rejected
   this delivery.
5. Compare available drivers.
6. Consider distance, availability, vehicle type,
   estimated time, and delivery cost.
7. Select the best suitable driver.
8. Assign the driver.

Selection principles:

- Prefer nearby drivers.
- Prefer shorter delivery time.
- Prefer lower delivery cost when other factors
  are similar.
- Never select an unavailable driver.
- Never select an excluded driver.
- Never invent driver information.
- Only use drivers returned by the tools.

If assignment fails because a selected driver
is no longer available, choose another available
candidate.

The primary objective is reliable delivery,
not simply the cheapest option.
"""


tools = [
    get_delivery_request,
    get_delivery_estimate,
    find_nearby_delivery_persons,
    calculate_delivery_quote,
    assign_delivery_person,
]


def create_agent_llm():

    llm = get_llm()

    return llm.bind_tools(tools)


async def agent_node(
    state: DeliveryAgentState,
) -> DeliveryAgentState:

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
    state: DeliveryAgentState,
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


def build_delivery_graph():

    graph = StateGraph(
        DeliveryAgentState
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