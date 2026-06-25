from authlib.integrations.base_client.errors import MismatchingStateError
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, Response

from app.config import get_settings
from app.dependencies import require_user
from app.oauth import oauth
from app.schemas import User

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.get("/google")
async def google_login(request: Request):
    if not settings.google_oauth_configured:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )

    # 계정 전환·재로그인 시 이전 OAuth state가 남아 있으면 MismatchingStateError 발생
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
    request.session["token"] = {
        "access_token": token.get("access_token"),
        "refresh_token": token.get("refresh_token"),
        "scope": token.get("scope", ""),
        "expires_at": token.get("expires_at"),
    }

    return RedirectResponse(url=f"{settings.frontend_url}/dashboard", status_code=302)


@router.get("/me", response_model=User)
async def get_me(request: Request):
    return require_user(request)


@router.post("/logout", status_code=204)
async def logout(request: Request):
    request.session.clear()
    return Response(status_code=204)
