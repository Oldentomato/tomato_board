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


def clear_session(request: Request) -> None:
    request.session.clear()


def raise_unauthorized(
    request: Request,
    *,
    detail: str = "Unauthorized",
) -> None:
    clear_session(request)
    raise HTTPException(status_code=401, detail=detail)


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


def get_google_credentials(request: Request) -> Credentials:
    token_data: dict[str, Any] | None = request.session.get("token")
    if not token_data or not token_data.get("access_token"):
        raise_unauthorized(request)

    scope = token_data.get("scope") or ""
    creds = Credentials(
        token=token_data.get("access_token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=[s for s in scope.split() if s],
        expiry=_parse_token_expiry(token_data),
    )

    if creds.expired:
        if not creds.refresh_token:
            raise_unauthorized(request, detail=REAUTH_DETAIL)
        try:
            creds.refresh(GoogleAuthRequest())
        except RefreshError:
            raise_unauthorized(request, detail=REAUTH_DETAIL)
        _persist_refreshed_token(request, token_data, creds)

    return creds
