from authlib.integrations.starlette_client import OAuth

from app.config import get_settings

settings = get_settings()

oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": (
            "openid email profile "
            "https://www.googleapis.com/auth/gmail.readonly "
            "https://www.googleapis.com/auth/calendar"
        ),
    },
    # authlib는 prompt만 authorize URL에 자동 포함한다.
    # access_type은 authorize_params로 넘겨야 Google이 refresh_token을 발급한다.
    authorize_params={
        "access_type": "offline",
        "prompt": "consent",
    },
)

GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar",
]
