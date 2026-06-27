from __future__ import annotations

from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph

from app.agents.registry import register_agent
from app.agents.state import AgentState
from app.config import Settings

GENERAL_SYSTEM_PROMPT = (
    "You are a helpful assistant for Tomato Board. "
    "Respond in the same language the user writes in. "
    "Keep answers clear and concise."
)


def _build_model() -> ChatOpenAI:
    settings = Settings()
    return ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=0.7,
        streaming=True,
    )


@register_agent("general", label="일반 대화", description="자유로운 일반 대화")
def build_general_graph():
    model = _build_model()

    async def call_model(state: AgentState) -> AgentState:
        prompt = [SystemMessage(content=GENERAL_SYSTEM_PROMPT), *state["messages"]]
        response = await model.ainvoke(prompt)
        return {"messages": [response]}

    graph = StateGraph(AgentState)
    graph.add_node("agent", call_model)
    graph.add_edge(START, "agent")
    graph.add_edge("agent", END)
    return graph.compile()
