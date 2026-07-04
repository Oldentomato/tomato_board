from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse

from ag_ui.core.types import RunAgentInput
from ag_ui.encoder import EventEncoder
from copilotkit import LangGraphAGUIAgent

from app.agents.context import bind_run_user_id, clear_run_user_id
from app.agents.registry import get_compiled_graph, list_agents
from app.dependencies import get_session_user


def _register_agui_endpoint(app: FastAPI, agent: LangGraphAGUIAgent, path: str) -> None:
    @app.post(path)
    async def langgraph_agent_endpoint(input_data: RunAgentInput, request: Request) -> StreamingResponse:
        user = get_session_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")

        thread_id = input_data.thread_id
        bind_run_user_id(user.id, thread_id=thread_id)

        accept_header = request.headers.get("accept")
        encoder = EventEncoder(accept=accept_header)
        request_agent = agent.clone()

        async def event_generator():
            try:
                async for event in request_agent.run(input_data):
                    yield encoder.encode(event)
            finally:
                clear_run_user_id(thread_id=thread_id)

        return StreamingResponse(event_generator(), media_type=encoder.get_content_type())

    @app.get(f"{path}/health")
    def health():
        return {"status": "ok", "agent": {"name": agent.name}}


def mount_agui_agents(app: FastAPI) -> None:
    """LangGraph 에이전트를 AG-UI 프로토콜 엔드포인트로 노출 (CopilotKit HttpAgent 연동용)."""
    for info in list_agents():
        graph = get_compiled_graph(info.id)
        langgraph_agent = LangGraphAGUIAgent(
            name=info.id,
            description=info.description or info.label,
            graph=graph,
        )
        _register_agui_endpoint(app, langgraph_agent, f"/api/agui/{info.id}")
