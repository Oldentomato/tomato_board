from __future__ import annotations

from contextvars import ContextVar

current_user_id_ctx: ContextVar[str | None] = ContextVar("current_user_id", default=None)


def get_current_user_id() -> str:
    user_id = current_user_id_ctx.get()
    if not user_id:
        raise ValueError("인증된 사용자 정보가 없습니다. 로그인 후 다시 시도하세요.")
    return user_id


def set_current_user_id(user_id: str | None) -> None:
    current_user_id_ctx.set(user_id)
