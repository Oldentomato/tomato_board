from contextlib import asynccontextmanager
import logging

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import get_settings
from app.database import init_db
from app.neo4j_client import close_neo4j, init_neo4j
from app.agents.runner import llm_configured
from app.agents.agui import mount_agui_agents
from app.routers import auth, calendar, chat, mail, memos, weather

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    init_neo4j()
    logger.info("LLM configured: %s", llm_configured())
    logger.info("Tavily web search: %s", settings.tavily_configured)
    yield
    close_neo4j()


app = FastAPI(title="Tomato Board API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    session_cookie=settings.session_cookie_name,
    max_age=60 * 60 * 24 * 7,
    same_site="lax",
    https_only=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")
api.include_router(auth.router)
api.include_router(weather.router)
api.include_router(mail.router)
api.include_router(calendar.router)
api.include_router(memos.router)
api.include_router(chat.router)


@api.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(api)
mount_agui_agents(app)
