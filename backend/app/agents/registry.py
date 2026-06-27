from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from fastapi import HTTPException
from langgraph.graph.state import CompiledStateGraph

from app.schemas import AgentInfo

DEFAULT_AGENT_ID = "general"

GraphFactory = Callable[[], CompiledStateGraph]


@dataclass(frozen=True)
class AgentDefinition:
    id: str
    label: str
    description: str
    factory: GraphFactory


_REGISTRY: dict[str, AgentDefinition] = {}
_COMPILED: dict[str, CompiledStateGraph] = {}


def register_agent(
    agent_id: str,
    *,
    label: str,
    description: str = "",
) -> Callable[[GraphFactory], GraphFactory]:
    def decorator(factory: GraphFactory) -> GraphFactory:
        _REGISTRY[agent_id] = AgentDefinition(
            id=agent_id,
            label=label,
            description=description,
            factory=factory,
        )
        return factory

    return decorator


def resolve_agent_id(agent_id: str | None) -> str:
    if not agent_id or agent_id == DEFAULT_AGENT_ID:
        return DEFAULT_AGENT_ID
    if agent_id not in _REGISTRY:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent_id}")
    return agent_id


def get_compiled_graph(agent_id: str | None) -> CompiledStateGraph:
    resolved = resolve_agent_id(agent_id)
    cached = _COMPILED.get(resolved)
    if cached is not None:
        return cached
    definition = _REGISTRY.get(resolved)
    if definition is None:
        raise HTTPException(status_code=404, detail=f"Agent not registered: {resolved}")
    compiled = definition.factory()
    _COMPILED[resolved] = compiled
    return compiled


def list_agents() -> list[AgentInfo]:
    return [
        AgentInfo(id=definition.id, label=definition.label, description=definition.description)
        for definition in _REGISTRY.values()
    ]
