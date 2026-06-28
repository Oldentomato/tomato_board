from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool
from starlette.responses import Response, StreamingResponse

from app.dependencies import require_user
from app.schemas import (
    AgentsResponse,
    ChatGraph,
    ChatRoomsResponse,
    CreateChatRoomResponse,
    FinalizeChatMessageInput,
    PrepareChatMessageResponse,
    SendChatMessageInput,
    SendChatMessageResponse,
    User,
)
from app.services import chat as chat_service
from app.agents.registry import list_agents

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/agents", response_model=AgentsResponse)
async def get_agents():
    return AgentsResponse(agents=list_agents())


@router.get("/rooms", response_model=ChatRoomsResponse)
async def list_rooms(user: User = Depends(require_user)):
    return await run_in_threadpool(chat_service.list_rooms, user.id)


@router.post("/rooms", response_model=CreateChatRoomResponse, status_code=201)
async def create_room(user: User = Depends(require_user)):
    return await run_in_threadpool(chat_service.create_room, user.id)


@router.delete("/rooms/{room_id}", status_code=204)
async def delete_room(room_id: str, user: User = Depends(require_user)):
    await run_in_threadpool(chat_service.delete_room, user.id, room_id)
    return Response(status_code=204)


@router.get("/rooms/{room_id}/graph", response_model=ChatGraph)
async def get_graph(room_id: str, user: User = Depends(require_user)):
    return await run_in_threadpool(chat_service.get_graph, user.id, room_id)


@router.post("/rooms/{room_id}/messages/prepare", response_model=PrepareChatMessageResponse)
async def prepare_message(
    room_id: str,
    body: SendChatMessageInput,
    user: User = Depends(require_user),
):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Content is required.")
    return await run_in_threadpool(
        chat_service.prepare_message,
        user.id,
        room_id,
        body.parentId,
        body.content,
    )


@router.put(
    "/rooms/{room_id}/messages/{assistant_node_id}",
    response_model=SendChatMessageResponse,
)
async def finalize_message(
    room_id: str,
    assistant_node_id: str,
    body: FinalizeChatMessageInput,
    user: User = Depends(require_user),
):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Content is required.")
    return await run_in_threadpool(
        chat_service.finalize_message,
        user.id,
        room_id,
        assistant_node_id,
        body,
    )


@router.post("/rooms/{room_id}/messages")
async def send_message(
    room_id: str,
    body: SendChatMessageInput,
    user: User = Depends(require_user),
):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Content is required.")

    return StreamingResponse(
        chat_service.send_message_stream(
            user.id,
            room_id,
            body.parentId,
            body.content,
            body.agentId,
        ),
        media_type="application/x-ndjson",
    )
