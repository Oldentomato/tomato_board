from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from authlib.integrations.starlette_client import OAuth

from app.oauth import oauth as app_oauth
from app.dependencies import normalize_stored_token, try_refresh_google_token
from starlette.requests import Request
import time


def _url_has_param(url: str, key: str, value: str) -> bool:
    return f"{key}={value}" in url or f"{key}%3D{value}" in url


def _make_request(session: dict | None = None) -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/mail/summary",
        "headers": [],
        "query_string": b"",
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
        "scheme": "http",
        "root_path": "",
        "session": session or {},
    }
    return Request(scope)


@pytest.mark.asyncio
async def test_google_authorize_url_requests_offline_refresh_token():
    """access_type=offline 이 authorize URL에 포함되어야 refresh_token을 받을 수 있다."""
    rv = await app_oauth.google.create_authorization_url("http://localhost/callback")
    url = rv["url"]

    assert _url_has_param(url, "access_type", "offline"), url
    assert _url_has_param(url, "prompt", "consent"), url


@pytest.mark.asyncio
async def test_client_kwargs_alone_does_not_include_access_type():
    """authlib 제한: client_kwargs의 access_type은 URL에 안 붙는다 (회귀 방지)."""
    broken = OAuth()
    broken.register(
        name="google",
        client_id="test",
        client_secret="secret",
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={
            "scope": "openid email",
            "prompt": "consent",
            "access_type": "offline",
        },
    )
    rv = await broken.google.create_authorization_url("http://localhost/callback")
    url = rv["url"]

    assert _url_has_param(url, "prompt", "consent")
    assert not _url_has_param(url, "access_type", "offline")


def test_normalize_stored_token_uses_expires_in_when_expires_at_missing():
    now = time.time()
    stored = normalize_stored_token(
        {
            "access_token": "at",
            "refresh_token": "rt",
            "scope": "openid",
            "expires_in": 3600,
        }
    )

    assert stored["access_token"] == "at"
    assert stored["refresh_token"] == "rt"
    assert stored["expires_at"] >= now + 3590


def test_try_refresh_skips_when_token_still_valid():
    expires_at = time.time() + 3600
    request = _make_request(
        {
            "token": {
                "access_token": "valid",
                "refresh_token": "rt",
                "scope": "openid",
                "expires_at": expires_at,
            }
        }
    )

    with patch("app.dependencies.Credentials.refresh") as refresh:
        assert try_refresh_google_token(request) is True
        refresh.assert_not_called()


def test_try_refresh_fails_without_refresh_token():
    expired_at = time.time() - 10
    request = _make_request(
        {
            "token": {
                "access_token": "expired",
                "scope": "openid",
                "expires_at": expired_at,
            }
        }
    )

    assert try_refresh_google_token(request) is False
    assert "token" not in request.session


def test_try_refresh_updates_session_on_success():
    expired_at = time.time() - 10
    request = _make_request(
        {
            "token": {
                "access_token": "expired",
                "refresh_token": "rt",
                "scope": "openid email",
                "expires_at": expired_at,
            }
        }
    )

    creds = MagicMock()
    creds.expired = True
    creds.expiry = datetime.utcnow() - timedelta(minutes=1)
    creds.refresh_token = "rt"
    creds.token = "new_access"
    creds.expiry = datetime.utcnow() + timedelta(hours=1)

    def _refresh(_google_req):
        creds.token = "new_access"

    creds.refresh.side_effect = _refresh

    with patch("app.dependencies._build_credentials", return_value=creds):
        assert try_refresh_google_token(request) is True

    assert request.session["token"]["access_token"] == "new_access"
    assert request.session["token"]["refresh_token"] == "rt"
