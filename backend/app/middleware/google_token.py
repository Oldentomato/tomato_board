from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse

from app.agents.context import reset_current_user_id, set_current_user_id
from app.dependencies import (
    REAUTH_DETAIL,
    clear_session,
    get_session_user,
    try_refresh_google_token,
)

PUBLIC_PATH_PREFIXES = (
    "/api/health",
    "/api/weather",
    "/api/auth/google",
)


def requires_google_auth(path: str, method: str) -> bool:
    if method == "OPTIONS":
        return False
    if not path.startswith("/api/"):
        return False
    if path == "/api/auth/logout":
        return False
    return not any(path.startswith(prefix) for prefix in PUBLIC_PATH_PREFIXES)


def _wrap_streaming_response(response: StreamingResponse, user_id: str | None) -> StreamingResponse:
    body = response.body_iterator

    async def stream_with_context():
        ctx_token = set_current_user_id(user_id)
        try:
            async for chunk in body:
                yield chunk
        finally:
            reset_current_user_id(ctx_token)

    return StreamingResponse(
        stream_with_context(),
        status_code=response.status_code,
        headers=dict(response.headers),
        media_type=response.media_type,
        background=response.background,
    )


class GoogleAuthMiddleware(BaseHTTPMiddleware):
    """보호된 API는 유효한 Google OAuth 세션(사용자 + 토큰)이 있을 때만 통과시킨다."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if not requires_google_auth(request.url.path, request.method):
            return await call_next(request)

        if not get_session_user(request):
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

        ok = await run_in_threadpool(try_refresh_google_token, request)
        if not ok:
            clear_session(request)
            return JSONResponse(status_code=401, content={"detail": REAUTH_DETAIL})

        user = get_session_user(request)
        user_id = user.id if user else None
        request.state.user_id = user_id
        ctx_token = set_current_user_id(user_id)

        try:
            response = await call_next(request)
        except Exception:
            reset_current_user_id(ctx_token)
            raise

        if isinstance(response, StreamingResponse):
            reset_current_user_id(ctx_token)
            return _wrap_streaming_response(response, user_id)

        reset_current_user_id(ctx_token)
        return response
