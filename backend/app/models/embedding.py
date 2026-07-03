from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.services.embeddings import EMBEDDING_MODEL

EMBED_STATUS_PENDING = "pending"
EMBED_STATUS_INDEXED = "indexed"
EMBED_STATUS_FAILED = "failed"


class EmbeddingIndexModel(Base):
    """사용자별 임베딩 인덱스 (Qdrant 컬렉션 1:1). 모델은 text-embedding-3-large 고정."""

    __tablename__ = "embedding_indexes"
    __table_args__ = (UniqueConstraint("user_id", "embedding_model", name="uq_user_embedding_model"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    embedding_model: Mapped[str] = mapped_column(String(128), default=EMBEDDING_MODEL)
    qdrant_collection: Mapped[str] = mapped_column(String(256), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    @staticmethod
    def utcnow() -> datetime:
        return datetime.now(timezone.utc)


class EmbeddedDocumentModel(Base):
    """임베딩 인덱스에 포함된 문서 메타데이터."""

    __tablename__ = "embedded_documents"
    __table_args__ = (UniqueConstraint("index_id", "document_id", name="uq_index_document"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    index_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("embedding_indexes.id", ondelete="CASCADE"), index=True
    )
    document_id: Mapped[str] = mapped_column(String(36), index=True)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default=EMBED_STATUS_PENDING)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    @staticmethod
    def utcnow() -> datetime:
        return datetime.now(timezone.utc)
