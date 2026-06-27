from __future__ import annotations

import json

import app.agents  # noqa: F401 — register agent graphs

from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from starlette.concurrency import run_in_threadpool

from app.neo4j_client import get_neo4j, neo4j_enabled
from app.agents.runner import LlmNotConfiguredError, build_conversation_messages, stream_agent_response
from app.schemas import (
    ChatGraph,
    ChatMessageNode,
    ChatRoom,
    ChatRoomsResponse,
    CreateChatRoomResponse,
    SendChatMessageResponse,
)

# ---------------------------------------------------------------------------
# In-memory fallback (NEO4J_URI 미설정 시)
# ---------------------------------------------------------------------------

_memory_rooms: dict[str, dict] = {}
_memory_graphs: dict[str, ChatGraph] = {}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class MessagePrepareResult:
    graph: ChatGraph
    user_node_id: str
    assistant_node_id: str


def _stream_event(event_type: str, data: dict) -> str:
    return json.dumps({"type": event_type, "data": data}, ensure_ascii=False) + "\n"


def _build_graph_from_nodes(room_id: str, root_id: str, nodes: dict[str, ChatMessageNode]) -> ChatGraph:
    return ChatGraph(roomId=room_id, rootId=root_id, nodes=nodes)


def _memory_list_rooms(user_id: str) -> ChatRoomsResponse:
    rooms = [
        ChatRoom(
            id=row["id"],
            title=row["title"],
            updatedAt=row["updatedAt"],
            preview=row["preview"],
        )
        for row in _memory_rooms.values()
        if row["userId"] == user_id
    ]
    rooms.sort(key=lambda r: r.updatedAt, reverse=True)
    return ChatRoomsResponse(rooms=rooms)


def _memory_get_room(user_id: str, room_id: str) -> None:
    row = _memory_rooms.get(room_id)
    if not row or row["userId"] != user_id:
        raise HTTPException(status_code=404, detail="Chat room not found.")


def _memory_create_room(user_id: str) -> CreateChatRoomResponse:
    room_id = str(uuid4())
    root_id = f"{room_id}-root"
    now = _utc_now()
    _memory_rooms[room_id] = {
        "id": room_id,
        "userId": user_id,
        "title": "새 대화",
        "preview": "새 대화가 시작되었습니다.",
        "updatedAt": now,
    }
    nodes = {
        root_id: ChatMessageNode(
            id=root_id,
            role="system",
            content="새 대화가 시작되었습니다.",
            createdAt=now,
            parentId=None,
            childIds=[],
        )
    }
    graph = _build_graph_from_nodes(room_id, root_id, nodes)
    _memory_graphs[room_id] = graph
    room = ChatRoom(id=room_id, title="새 대화", updatedAt=now, preview="새 대화가 시작되었습니다.")
    return CreateChatRoomResponse(room=room, graph=graph)


def _memory_get_graph(user_id: str, room_id: str) -> ChatGraph:
    _memory_get_room(user_id, room_id)
    graph = _memory_graphs.get(room_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Chat graph not found.")
    return graph


def _memory_delete_room(user_id: str, room_id: str) -> None:
    _memory_get_room(user_id, room_id)
    del _memory_rooms[room_id]
    _memory_graphs.pop(room_id, None)


def _memory_prepare_message(user_id: str, room_id: str, parent_id: str, content: str) -> MessagePrepareResult:
    trimmed = content.strip()
    if not trimmed:
        raise HTTPException(status_code=400, detail="Content is required.")

    _memory_get_room(user_id, room_id)
    graph = _memory_graphs.get(room_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Chat graph not found.")

    parent = graph.nodes.get(parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent node not found.")

    now = _utc_now()
    user_node_id = str(uuid4())
    assistant_node_id = str(uuid4())

    user_node = ChatMessageNode(
        id=user_node_id,
        role="user",
        content=trimmed,
        createdAt=now,
        parentId=parent_id,
        childIds=[assistant_node_id],
    )
    assistant_node = ChatMessageNode(
        id=assistant_node_id,
        role="assistant",
        content="",
        createdAt=now,
        parentId=user_node_id,
        childIds=[],
    )

    updated_nodes = dict(graph.nodes)
    updated_nodes[parent_id] = parent.model_copy(
        update={"childIds": [*parent.childIds, user_node_id]}
    )
    updated_nodes[user_node_id] = user_node
    updated_nodes[assistant_node_id] = assistant_node
    updated_graph = _build_graph_from_nodes(room_id, graph.rootId, updated_nodes)
    _memory_graphs[room_id] = updated_graph

    room_row = _memory_rooms[room_id]
    room_row["updatedAt"] = now
    room_row["preview"] = trimmed
    if room_row["title"] == "새 대화":
        room_row["title"] = trimmed[:24]

    return MessagePrepareResult(
        graph=updated_graph,
        user_node_id=user_node_id,
        assistant_node_id=assistant_node_id,
    )


def _memory_finalize_message(
    user_id: str,
    room_id: str,
    assistant_node_id: str,
    content: str,
) -> SendChatMessageResponse:
    _memory_get_room(user_id, room_id)
    graph = _memory_graphs.get(room_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Chat graph not found.")

    assistant = graph.nodes.get(assistant_node_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant node not found.")

    updated_nodes = dict(graph.nodes)
    updated_nodes[assistant_node_id] = assistant.model_copy(
        update={"content": content, "createdAt": _utc_now()}
    )
    updated_graph = _build_graph_from_nodes(room_id, graph.rootId, updated_nodes)
    _memory_graphs[room_id] = updated_graph
    return SendChatMessageResponse(graph=updated_graph, activeNodeId=assistant_node_id)


# ---------------------------------------------------------------------------
# Neo4j
# ---------------------------------------------------------------------------


def _neo4j_list_rooms(user_id: str) -> ChatRoomsResponse:
    driver = get_neo4j()
    query = """
    MATCH (u:User {id: $userId})-[:OWNS]->(r:ChatRoom)
    RETURN r.id AS id, r.title AS title, r.updatedAt AS updatedAt, r.preview AS preview
    ORDER BY r.updatedAt DESC
    """
    with driver.session() as session:
        records = session.run(query, userId=user_id).data()
    rooms = [ChatRoom(**row) for row in records]
    return ChatRoomsResponse(rooms=rooms)


def _neo4j_create_room(user_id: str) -> CreateChatRoomResponse:
    driver = get_neo4j()
    room_id = str(uuid4())
    root_id = f"{room_id}-root"
    now = _utc_now()
    query = """
    MERGE (u:User {id: $userId})
    CREATE (r:ChatRoom {
        id: $roomId,
        userId: $userId,
        title: $title,
        preview: $preview,
        updatedAt: $now
    })
    CREATE (root:Message {
        id: $rootId,
        roomId: $roomId,
        role: 'system',
        content: $rootContent,
        createdAt: $now
    })
    MERGE (u)-[:OWNS]->(r)
    MERGE (r)-[:HAS_ROOT]->(root)
    RETURN r.id AS id, r.title AS title, r.updatedAt AS updatedAt, r.preview AS preview
    """
    with driver.session() as session:
        session.run(
            query,
            userId=user_id,
            roomId=room_id,
            rootId=root_id,
            title="새 대화",
            preview="새 대화가 시작되었습니다.",
            rootContent="새 대화가 시작되었습니다.",
            now=now,
        )
    graph = _neo4j_get_graph(user_id, room_id)
    room = ChatRoom(id=room_id, title="새 대화", updatedAt=now, preview="새 대화가 시작되었습니다.")
    return CreateChatRoomResponse(room=room, graph=graph)


def _neo4j_get_graph(user_id: str, room_id: str) -> ChatGraph:
    driver = get_neo4j()
    query = """
    MATCH (r:ChatRoom {id: $roomId, userId: $userId})-[:HAS_ROOT]->(root:Message)
    MATCH (m:Message {roomId: $roomId})
    OPTIONAL MATCH (child:Message)-[:CHILD_OF]->(m)
    OPTIONAL MATCH (m)-[:CHILD_OF]->(parent:Message)
    WITH root, m, collect(DISTINCT child.id) AS childIds, parent.id AS parentId
    RETURN root.id AS rootId,
           collect({
               id: m.id,
               role: m.role,
               content: m.content,
               createdAt: m.createdAt,
               parentId: parentId,
               childIds: childIds
           }) AS messages
    """
    with driver.session() as session:
        record = session.run(query, userId=user_id, roomId=room_id).single()
    if not record:
        raise HTTPException(status_code=404, detail="Chat room not found.")

    nodes: dict[str, ChatMessageNode] = {}
    for row in record["messages"]:
        node = ChatMessageNode(
            id=row["id"],
            role=row["role"],
            content=row["content"],
            createdAt=row["createdAt"],
            parentId=row.get("parentId"),
            childIds=row.get("childIds") or [],
        )
        nodes[node.id] = node
    return ChatGraph(roomId=room_id, rootId=record["rootId"], nodes=nodes)


def _neo4j_prepare_message(user_id: str, room_id: str, parent_id: str, content: str) -> MessagePrepareResult:
    trimmed = content.strip()
    if not trimmed:
        raise HTTPException(status_code=400, detail="Content is required.")

    driver = get_neo4j()
    user_node_id = str(uuid4())
    assistant_node_id = str(uuid4())
    now = _utc_now()
    title_slice = trimmed[:24]

    query = """
    MATCH (r:ChatRoom {id: $roomId, userId: $userId})
    MATCH (parent:Message {id: $parentId, roomId: $roomId})
    CREATE (user:Message {
        id: $userNodeId,
        roomId: $roomId,
        role: 'user',
        content: $content,
        createdAt: $now
    })
    CREATE (assistant:Message {
        id: $assistantNodeId,
        roomId: $roomId,
        role: 'assistant',
        content: '',
        createdAt: $now
    })
    CREATE (user)-[:CHILD_OF]->(parent)
    CREATE (assistant)-[:CHILD_OF]->(user)
    SET r.updatedAt = $now,
        r.preview = $content,
        r.title = CASE WHEN r.title = '새 대화' THEN $titleSlice ELSE r.title END
    RETURN assistant.id AS assistantNodeId
    """
    with driver.session() as session:
        record = session.run(
            query,
            userId=user_id,
            roomId=room_id,
            parentId=parent_id,
            userNodeId=user_node_id,
            assistantNodeId=assistant_node_id,
            content=trimmed,
            now=now,
            titleSlice=title_slice,
        ).single()

    if not record:
        raise HTTPException(status_code=404, detail="Chat room or parent node not found.")

    graph = _neo4j_get_graph(user_id, room_id)
    return MessagePrepareResult(
        graph=graph,
        user_node_id=user_node_id,
        assistant_node_id=assistant_node_id,
    )


def _neo4j_finalize_message(
    user_id: str,
    room_id: str,
    assistant_node_id: str,
    content: str,
) -> SendChatMessageResponse:
    driver = get_neo4j()
    query = """
    MATCH (assistant:Message {id: $assistantNodeId, roomId: $roomId})
    MATCH (r:ChatRoom {id: $roomId, userId: $userId})
    SET assistant.content = $content,
        assistant.createdAt = $replyAt
    RETURN assistant.id AS activeNodeId
    """
    with driver.session() as session:
        record = session.run(
            query,
            userId=user_id,
            roomId=room_id,
            assistantNodeId=assistant_node_id,
            content=content,
            replyAt=_utc_now(),
        ).single()

    if not record:
        raise HTTPException(status_code=404, detail="Assistant node not found.")

    graph = _neo4j_get_graph(user_id, room_id)
    return SendChatMessageResponse(graph=graph, activeNodeId=record["activeNodeId"])


def _neo4j_delete_room(user_id: str, room_id: str) -> None:
    driver = get_neo4j()
    query = """
    MATCH (r:ChatRoom {id: $roomId, userId: $userId})
    WITH r, r.id AS roomId
    OPTIONAL MATCH (m:Message {roomId: $roomId})
    DETACH DELETE m, r
    RETURN roomId
    """
    with driver.session() as session:
        record = session.run(query, userId=user_id, roomId=room_id).single()
    if not record:
        raise HTTPException(status_code=404, detail="Chat room not found.")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def list_rooms(user_id: str) -> ChatRoomsResponse:
    if neo4j_enabled():
        return _neo4j_list_rooms(user_id)
    return _memory_list_rooms(user_id)


def create_room(user_id: str) -> CreateChatRoomResponse:
    if neo4j_enabled():
        return _neo4j_create_room(user_id)
    return _memory_create_room(user_id)


def get_graph(user_id: str, room_id: str) -> ChatGraph:
    if neo4j_enabled():
        return _neo4j_get_graph(user_id, room_id)
    return _memory_get_graph(user_id, room_id)


def _prepare_message(user_id: str, room_id: str, parent_id: str, content: str) -> MessagePrepareResult:
    if neo4j_enabled():
        return _neo4j_prepare_message(user_id, room_id, parent_id, content)
    return _memory_prepare_message(user_id, room_id, parent_id, content)


def _finalize_message(
    user_id: str,
    room_id: str,
    assistant_node_id: str,
    content: str,
) -> SendChatMessageResponse:
    if neo4j_enabled():
        return _neo4j_finalize_message(user_id, room_id, assistant_node_id, content)
    return _memory_finalize_message(user_id, room_id, assistant_node_id, content)


async def send_message_stream(
    user_id: str,
    room_id: str,
    parent_id: str,
    content: str,
    agent_id: str | None = None,
) -> AsyncIterator[str]:
    trimmed = content.strip()
    if not trimmed:
        raise HTTPException(status_code=400, detail="Content is required.")

    prepared = await run_in_threadpool(_prepare_message, user_id, room_id, parent_id, trimmed)
    yield _stream_event(
        "init",
        {
            "graph": prepared.graph.model_dump(),
            "userNodeId": prepared.user_node_id,
            "assistantNodeId": prepared.assistant_node_id,
        },
    )

    conversation = build_conversation_messages(prepared.graph, parent_id, trimmed)
    full_content = ""
    try:
        async for chunk in stream_agent_response(agent_id, conversation):
            full_content += chunk
            yield _stream_event("delta", {"delta": chunk})
    except LlmNotConfiguredError:
        full_content = (
            "LLM이 설정되지 않았습니다. backend/.env에 OPENAI_API_KEY를 설정해 주세요."
        )
        yield _stream_event("delta", {"delta": full_content})
    except Exception:
        full_content = "응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
        yield _stream_event("delta", {"delta": full_content})

    result = await run_in_threadpool(
        _finalize_message,
        user_id,
        room_id,
        prepared.assistant_node_id,
        full_content,
    )
    yield _stream_event(
        "done",
        {
            "graph": result.graph.model_dump(),
            "activeNodeId": result.activeNodeId,
        },
    )


def delete_room(user_id: str, room_id: str) -> None:
    if neo4j_enabled():
        return _neo4j_delete_room(user_id, room_id)
    return _memory_delete_room(user_id, room_id)
