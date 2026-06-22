from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Base(DeclarativeBase):
    pass


def _resolve_database_url() -> str:
    settings = get_settings()
    url = settings.database_url
    if url.startswith("sqlite:///./"):
        db_path = BACKEND_ROOT / url.removeprefix("sqlite:///./")
        return f"sqlite:///{db_path.as_posix()}"
    return url


_DATABASE_URL = _resolve_database_url()
engine = create_engine(
    _DATABASE_URL,
    connect_args={"check_same_thread": False} if _DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def migrate_memo_columns(db_engine) -> None:
    inspector = inspect(db_engine)
    if "memos" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("memos")}
    added_columns = False
    with db_engine.begin() as conn:
        if "side" not in columns:
            conn.execute(text("ALTER TABLE memos ADD COLUMN side VARCHAR(8) NOT NULL DEFAULT 'left'"))
            added_columns = True
        if "sort_order" not in columns:
            conn.execute(text("ALTER TABLE memos ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"))
            added_columns = True

    if not added_columns:
        return

    from sqlalchemy import select

    from app.models.memo import MemoModel

    db = SessionLocal()
    try:
        rows = db.scalars(
            select(MemoModel).order_by(MemoModel.created_at.asc())
        ).all()
        left_order = 0
        right_order = 0
        for index, row in enumerate(rows):
            row.side = "left" if index % 2 == 0 else "right"
            if row.side == "left":
                row.sort_order = left_order
                left_order += 1
            else:
                row.sort_order = right_order
                right_order += 1
        db.commit()
    finally:
        db.close()


def init_db() -> None:
    from app.models import memo  # noqa: F401

    Base.metadata.create_all(bind=engine)
    migrate_memo_columns(engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
