from __future__ import annotations

from collections.abc import AsyncIterator

from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage, HumanMessage

from app.agents.registry import get_compiled_graph
from app.config import Settings
from app.schemas import ChatGraph


class LlmNotConfiguredError(RuntimeError):
    pass


def llm_configured() -> bool:
    # get_settings()는 @lru_cache — .env 수정 후 재시작 전까지 빈 값이 남을 수 있음
    return bool(Settings().openai_api_key.strip())


def build_conversation_messages(
    graph: ChatGraph,
    parent_id: str,
    user_content: str,
) -> list[BaseMessage]:
    path: list[tuple[str, str]] = []
    current_id: str | None = parent_id
    while current_id:
        node = graph.nodes.get(current_id)
        if not node:
            break
        if node.role in ("user", "assistant"):
            path.append((node.role, node.content))
        current_id = node.parentId

    path.reverse()
    messages: list[BaseMessage] = []
    for role, content in path:
        if role == "user":
            messages.append(HumanMessage(content=content))
        else:
            messages.append(AIMessage(content=content))
    messages.append(HumanMessage(content=user_content))
    return messages


async def stream_agent_response(
    agent_id: str | None,
    messages: list[BaseMessage],
) -> AsyncIterator[str]:
    if not llm_configured():
        raise LlmNotConfiguredError("OPENAI_API_KEY is not configured.")

    compiled = get_compiled_graph(agent_id)
    streamed = False
    async for event in compiled.astream_events(
        {"messages": messages},
        version="v2",
    ):
        if event["event"] != "on_chat_model_stream":
            continue
        chunk = event["data"].get("chunk")
        if not isinstance(chunk, (AIMessage, AIMessageChunk)):
            continue
        content = chunk.content
        if isinstance(content, str) and content:
            streamed = True
            yield content

    if streamed:
        return

    result = await compiled.ainvoke({"messages": messages})
    last_message = result["messages"][-1]
    content = last_message.content
    if isinstance(content, str) and content:
        yield content
