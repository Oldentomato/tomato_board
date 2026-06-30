from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

DOCUMENT_STATUS_UPLOADED = "uploaded"
DOCUMENT_STATUS_CONVERTED = "converted"
DOCUMENT_STATUS_FAILED = "failed"


class UserStorageModel(Base):
    __tablename__ = "user_storage"

    user_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    storage_prefix: Mapped[str] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DocumentModel(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    title: Mapped[str] = mapped_column(String(256))
    original_filename: Mapped[str] = mapped_column(String(512))
    source_format: Mapped[str] = mapped_column(String(32))
    output_format: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source_object_key: Mapped[str] = mapped_column(String(1024))
    output_object_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default=DOCUMENT_STATUS_UPLOADED)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String(128), default="application/octet-stream")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    @staticmethod
    def utcnow() -> datetime:
        return datetime.now(timezone.utc)
