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
        "prompt": "consent",
        "access_type": "offline",
    },
)

GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar",
]
