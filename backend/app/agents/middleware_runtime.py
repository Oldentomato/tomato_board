from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from langchain.agents.middleware import AgentMiddleware
from langchain.agents.middleware.types import ModelRequest, ModelResponse
from langchain_core.messages import SystemMessage

from app.agents.runtime_context import format_runtime_context_block


class RuntimeContextMiddleware(AgentMiddleware):
    """Inject current datetime/timezone/locale into every model call.

    This supplies ground-truth facts, not situation examples, so relative-time
    and locale-aware reasoning work without enumerating edge cases in the prompt.
    """

    def wrap_model_call(
        self,
        request: ModelRequest[Any],
        handler: Callable[[ModelRequest[Any]], ModelResponse[Any]],
    ) -> ModelResponse[Any]:
        return handler(self._with_runtime_context(request))

    async def awrap_model_call(
        self,
        request: ModelRequest[Any],
        handler: Callable[[ModelRequest[Any]], Awaitable[ModelResponse[Any]]],
    ) -> ModelResponse[Any]:
        return await handler(self._with_runtime_context(request))

    def _with_runtime_context(self, request: ModelRequest[Any]) -> ModelRequest[Any]:
        block = format_runtime_context_block()
        existing = request.system_message
        if existing is None:
            system_message = SystemMessage(content=block)
        else:
            base = existing.content if isinstance(existing.content, str) else str(existing.content)
            if "# Runtime context" in base:
                system_message = existing
            else:
                system_message = SystemMessage(content=f"{base.rstrip()}\n\n{block}")
        return request.override(system_message=system_message)
