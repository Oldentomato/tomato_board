from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, Request
from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError

from app.config import get_settings
from app.schemas import User

settings = get_settings()

REAUTH_DETAIL = "Google token expired. Please sign in again."
REFRESH_BUFFER_SECONDS = 300


def clear_session(request: Request) -> None:
    request.session.clear()


def clear_google_token(request: Request) -> None:
    request.session.pop("token", None)


def raise_google_token_error(request: Request) -> None:
    clear_session(request)
    raise HTTPException(status_code=401, detail=REAUTH_DETAIL)


def google_http_error_to_api(
    exc: HttpError,
    *,
    request: Request,
    resource: str,
    not_found_detail: str | None = None,
) -> HTTPException:
    status = exc.resp.status if exc.resp else 500
    if status == 401:
        clear_session(request)
        return HTTPException(status_code=401, detail=REAUTH_DETAIL)
    if status == 404 and not_found_detail:
        return HTTPException(status_code=404, detail=not_found_detail)
    if status == 403:
        return HTTPException(
            status_code=403,
            detail=f"{resource} API access denied. Check OAuth scopes.",
        )
    return HTTPException(status_code=502, detail=f"Failed to access {resource}.")


def get_session_user(request: Request) -> User | None:
    data = request.session.get("user")
    if not data:
        return None
    return User(**data)


def require_user(request: Request) -> User:
    user = get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user


def _parse_token_expiry(token_data: dict[str, Any]) -> datetime | None:
    expires_at = token_data.get("expires_at")
    if expires_at is None:
        return None
    # google-auth는 expiry를 naive UTC로 비교함
    aware = datetime.fromtimestamp(float(expires_at), tz=timezone.utc)
    return aware.replace(tzinfo=None)


def _expiry_to_timestamp(expiry: datetime | None) -> float | None:
    if expiry is None:
        return None
    if expiry.tzinfo is None:
        return expiry.replace(tzinfo=timezone.utc).timestamp()
    return expiry.astimezone(timezone.utc).timestamp()


def _persist_refreshed_token(
    request: Request,
    token_data: dict[str, Any],
    creds: Credentials,
) -> None:
    request.session["token"] = {
        **token_data,
        "access_token": creds.token,
        "refresh_token": creds.refresh_token or token_data.get("refresh_token"),
        "expires_at": _expiry_to_timestamp(creds.expiry),
    }


def _build_credentials(token_data: dict[str, Any]) -> Credentials:
    scope = token_data.get("scope") or ""
    return Credentials(
        token=token_data.get("access_token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=[s for s in scope.split() if s],
        expiry=_parse_token_expiry(token_data),
    )


def _token_needs_refresh(creds: Credentials) -> bool:
    if creds.expired:
        return True
    if creds.expiry is None:
        return False
    remaining = (creds.expiry - datetime.utcnow()).total_seconds()
    return remaining < REFRESH_BUFFER_SECONDS


def try_refresh_google_token(request: Request) -> bool:
    """Google access token을 필요 시 갱신한다."""
    token_data: dict[str, Any] | None = request.session.get("token")
    if not token_data or not token_data.get("access_token"):
        return False

    creds = _build_credentials(token_data)
    if not _token_needs_refresh(creds):
        return True

    if not creds.refresh_token:
        clear_google_token(request)
        return False

    try:
        creds.refresh(GoogleAuthRequest())
    except RefreshError:
        clear_google_token(request)
        return False

    _persist_refreshed_token(request, token_data, creds)
    return True


def get_google_credentials(request: Request) -> Credentials:
    if not try_refresh_google_token(request):
        raise_google_token_error(request)

    token_data = request.session.get("token")
    if not token_data:
        raise_google_token_error(request)
    return _build_credentials(token_data)
