from __future__ import annotations

from fastapi import FastAPI

from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from copilotkit import LangGraphAGUIAgent

from app.agents.registry import get_compiled_graph, list_agents


def mount_agui_agents(app: FastAPI) -> None:
    """LangGraph 에이전트를 AG-UI 프로토콜 엔드포인트로 노출 (CopilotKit HttpAgent 연동용)."""
    for info in list_agents():
        graph = get_compiled_graph(info.id)
        add_langgraph_fastapi_endpoint(
            app=app,
            agent=LangGraphAGUIAgent(
                name=info.id,
                description=info.description or info.label,
                graph=graph,
            ),
            path=f"/api/agui/{info.id}",
        )
