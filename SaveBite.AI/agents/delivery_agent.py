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
    find_nearby_delivery_persons,
    get_delivery_request,
)


SYSTEM_PROMPT = """
You are the SaveBite Delivery Agent.

Your job is to autonomously coordinate delivery
assignment.

You have these tools:

1. get_delivery_request
2. find_nearby_delivery_persons
3. assign_delivery_person

Your workflow:

1. Retrieve the delivery request.
2. Determine the pickup location.
3. Find available delivery persons near pickup.
4. Exclude previously rejected drivers.
5. Evaluate candidates.
6. Prefer the closest suitable available driver.
7. Assign the selected driver.

Important rules:

- Never invent drivers.
- Only choose drivers returned by the tool.
- Never choose an excluded driver.
- Never choose an unavailable driver.
- Prefer the nearest suitable driver.
- If there are no suitable drivers, report that
  no driver is currently available.
- If assignment fails because a driver became
  unavailable, continue with another candidate.
"""


tools = [
    get_delivery_request,
    find_nearby_delivery_persons,
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