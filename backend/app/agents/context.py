from __future__ import annotations

from contextvars import ContextVar, Token

current_user_id_ctx: ContextVar[str | None] = ContextVar("current_user_id", default=None)
_run_user_ids: dict[str, str] = {}


def bind_run_user_id(user_id: str, *, thread_id: str | None = None) -> None:
    if thread_id:
        _run_user_ids[thread_id] = user_id


def clear_run_user_id(*, thread_id: str | None = None) -> None:
    if thread_id:
        _run_user_ids.pop(thread_id, None)


def set_current_user_id(user_id: str | None) -> Token:
    return current_user_id_ctx.set(user_id)


def reset_current_user_id(token: Token) -> None:
    current_user_id_ctx.reset(token)


def get_current_user_id() -> str:
    user_id = current_user_id_ctx.get()
    if user_id:
        return user_id

    try:
        from langgraph.config import get_config

        cfg = get_config()
        thread_id = (cfg.get("configurable") or {}).get("thread_id")
        if thread_id and thread_id in _run_user_ids:
            return _run_user_ids[thread_id]
    except Exception:
        pass

    raise ValueError("인증된 사용자 정보가 없습니다. 로그인 후 다시 시도하세요.")
