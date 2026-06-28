from __future__ import annotations

from copilotkit import CopilotKitMiddleware
from langchain.agents import create_agent
from langchain_core.messages import SystemMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from app.agents.model import build_chat_model
from app.agents.registry import register_agent
from app.agents.state import AgentState
from app.agents.tools import get_web_search_tools

GENERAL_SYSTEM_PROMPT = (
    "You are a helpful assistant for Tomato Board. "
    "Respond in the same language the user writes in. "
    "Keep answers clear and concise. "
    "When the user asks about current events, recent news, live data, prices, weather, "
    "or anything that may have changed after your training data, use the web search tool. "
    "When you use search results, mention the source title or URL when helpful."
)


def _build_simple_graph(model):
    async def call_model(state: AgentState) -> AgentState:
        prompt = [SystemMessage(content=GENERAL_SYSTEM_PROMPT), *state["messages"]]
        response = await model.ainvoke(prompt)
        return {"messages": [response]}

    graph = StateGraph(AgentState)
    graph.add_node("agent", call_model)
    graph.add_edge(START, "agent")
    graph.add_edge("agent", END)
    return graph.compile(checkpointer=MemorySaver())


@register_agent(
    "general",
    label="일반 대화",
    description="웹 검색을 활용하는 일반 대화",
)
def build_general_graph():
    model = build_chat_model()
    tools = get_web_search_tools()

    if tools:
        return create_agent(
            model,
            tools,
            system_prompt=GENERAL_SYSTEM_PROMPT,
            middleware=[CopilotKitMiddleware()],
            checkpointer=MemorySaver(),
        )

    return _build_simple_graph(model)
