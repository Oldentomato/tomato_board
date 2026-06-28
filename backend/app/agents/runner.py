from __future__ import annotations

import json
from collections.abc import AsyncIterator, Iterator
from dataclasses import dataclass
from typing import Any, Literal

from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage, HumanMessage

from app.agents.registry import get_compiled_graph
from app.config import Settings
from app.schemas import ChatGraph

StreamKind = Literal["text", "thought", "tool_start", "tool_end", "step_start", "step_end"]


class LlmNotConfiguredError(RuntimeError):
    pass


@dataclass(frozen=True)
class AgentStreamPart:
    kind: StreamKind
    delta: str = ""
    tool_name: str | None = None
    tool_input: dict[str, Any] | None = None
    tool_output: str | None = None
    step_name: str | None = None
    run_id: str | None = None


def llm_configured() -> bool:
    # get_settings()는 @lru_cache — .env 수정 후 재시작 전까지 빈 값이 남을 수 있음
    return bool(Settings().openai_api_key.strip())


def _reasoning_text_from_item(item: object) -> str:
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        for key in ("text", "summary", "content"):
            value = item.get(key)
            if isinstance(value, str) and value:
                return value
    return ""


def _iter_content_parts(content: object) -> Iterator[tuple[StreamKind, str]]:
    if isinstance(content, str):
        if content:
            yield "text", content
        return

    if not isinstance(content, list):
        return

    for block in content:
        if not isinstance(block, dict):
            continue

        block_type = block.get("type")
        if block_type in {"function_call", "tool_call", "custom_tool_call"}:
            continue
        if block_type == "reasoning":
            for key in ("summary", "content"):
                for item in block.get(key) or []:
                    text = _reasoning_text_from_item(item)
                    if text:
                        yield "thought", text
        elif block_type == "text":
            text = block.get("text", "")
            if isinstance(text, str) and text:
                yield "text", text


def _iter_chunk_parts(chunk: AIMessage | AIMessageChunk) -> Iterator[tuple[StreamKind, str]]:
    yield from _iter_content_parts(chunk.content)

    reasoning = chunk.additional_kwargs.get("reasoning_content")
    if isinstance(reasoning, str) and reasoning:
        yield "thought", reasoning


def _serialize_tool_output(output: object) -> str:
    if isinstance(output, str):
        return output
    try:
        return json.dumps(output, ensure_ascii=False, default=str)
    except TypeError:
        return str(output)


def _tool_input_from_event(event: dict[str, Any]) -> dict[str, Any] | None:
    data = event.get("data") or {}
    raw_input = data.get("input")
    if isinstance(raw_input, dict):
        return raw_input
    return None


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
) -> AsyncIterator[AgentStreamPart]:
    if not llm_configured():
        raise LlmNotConfiguredError("OPENAI_API_KEY is not configured.")

    compiled = get_compiled_graph(agent_id)
    streamed = False
    async for event in compiled.astream_events(
        {"messages": messages},
        version="v2",
    ):
        event_type = event.get("event")
        run_id = event.get("run_id")

        if event_type == "on_tool_start":
            tool_name = event.get("name") or (event.get("data") or {}).get("name") or "tool"
            yield AgentStreamPart(
                kind="tool_start",
                tool_name=str(tool_name),
                tool_input=_tool_input_from_event(event),
                run_id=run_id,
            )
            continue

        if event_type == "on_tool_end":
            data = event.get("data") or {}
            tool_name = event.get("name") or data.get("name") or "tool"
            yield AgentStreamPart(
                kind="tool_end",
                tool_name=str(tool_name),
                tool_output=_serialize_tool_output(data.get("output")),
                run_id=run_id,
            )
            continue

        if event_type == "on_chain_start":
            step_name = event.get("name")
            if isinstance(step_name, str) and step_name not in {"LangGraph", "RunnableSequence"}:
                yield AgentStreamPart(kind="step_start", step_name=step_name, run_id=run_id)
            continue

        if event_type == "on_chain_end":
            step_name = event.get("name")
            if isinstance(step_name, str) and step_name not in {"LangGraph", "RunnableSequence"}:
                yield AgentStreamPart(kind="step_end", step_name=step_name, run_id=run_id)
            continue

        if event_type != "on_chat_model_stream":
            continue

        chunk = event["data"].get("chunk")
        if not isinstance(chunk, (AIMessage, AIMessageChunk)):
            continue
        for kind, delta in _iter_chunk_parts(chunk):
            streamed = True
            yield AgentStreamPart(kind=kind, delta=delta)

    if streamed:
        return

    result = await compiled.ainvoke({"messages": messages})
    last_message = result["messages"][-1]
    for kind, delta in _iter_chunk_parts(last_message):
        yield AgentStreamPart(kind=kind, delta=delta)
