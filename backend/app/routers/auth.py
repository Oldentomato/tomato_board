import logging

from authlib.integrations.base_client.errors import MismatchingStateError
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, Response

from app.config import get_settings
from app.dependencies import normalize_stored_token, require_user
from app.oauth import oauth
from app.schemas import User

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()
logger = logging.getLogger(__name__)


@router.get("/google")
async def google_login(request: Request):
    if not settings.google_oauth_configured:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )

    request.session.clear()
    return await oauth.google.authorize_redirect(request, settings.oauth_callback_url)


@router.get("/google/callback")
async def google_callback(request: Request):
    if not settings.google_oauth_configured:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured.")

    try:
        token = await oauth.google.authorize_access_token(request)
    except MismatchingStateError:
        request.session.clear()
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error=oauth_state",
            status_code=302,
        )
    userinfo = token.get("userinfo")

    if not userinfo:
        raise HTTPException(status_code=400, detail="Failed to retrieve user info from Google.")

    request.session["user"] = {
        "id": userinfo["sub"],
        "email": userinfo.get("email", ""),
        "name": userinfo.get("name", userinfo.get("email", "User")),
        "picture": userinfo.get("picture"),
    }
    stored_token = normalize_stored_token(token)
    if not stored_token.get("refresh_token"):
        logger.error(
            "Google OAuth completed without refresh_token for %s; "
            "access token will expire in ~1 hour",
            userinfo.get("email", userinfo["sub"]),
        )
    request.session["token"] = stored_token

    return RedirectResponse(url=f"{settings.frontend_url}/dashboard", status_code=302)


@router.get("/me", response_model=User)
async def get_me(request: Request):
    return require_user(request)


@router.post("/logout", status_code=204)
async def logout(request: Request):
    request.session.clear()
    return Response(status_code=204)
