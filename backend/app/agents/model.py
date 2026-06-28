from __future__ import annotations

from langchain_openai import ChatOpenAI

from app.config import Settings

_REASONING_MODEL_PREFIXES = ("o1", "o3", "o4", "gpt-5")


def model_supports_reasoning(model: str) -> bool:
    normalized = model.strip().lower()
    return any(normalized.startswith(prefix) for prefix in _REASONING_MODEL_PREFIXES)


def build_chat_model() -> ChatOpenAI:
    settings = Settings()
    kwargs: dict = {
        "model": settings.openai_model,
        "api_key": settings.openai_api_key,
        "streaming": True,
    }

    use_reasoning = settings.openai_reasoning_enabled and model_supports_reasoning(settings.openai_model)
    if use_reasoning:
        reasoning: dict[str, str] = {"effort": settings.openai_reasoning_effort}
        if settings.openai_reasoning_summary:
            reasoning["summary"] = settings.openai_reasoning_summary
        kwargs["reasoning"] = reasoning
        kwargs["output_version"] = "responses/v1"
    else:
        kwargs["temperature"] = 0.7

    return ChatOpenAI(**kwargs)
