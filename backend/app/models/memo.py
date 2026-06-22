from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

DEFAULT_MEMO_COLOR = "#FFF9C4"
DEFAULT_MEMO_SIDE = "left"


class MemoModel(Base):
    __tablename__ = "memos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    content: Mapped[str] = mapped_column(Text)
    color: Mapped[str] = mapped_column(String(16), default=DEFAULT_MEMO_COLOR)
    side: Mapped[str] = mapped_column(String(8), default=DEFAULT_MEMO_SIDE)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    @staticmethod
    def utcnow() -> datetime:
        return datetime.now(timezone.utc)
