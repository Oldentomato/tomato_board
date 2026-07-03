from __future__ import annotations

from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.document import DocumentModel
from app.models.embedding import (
    EMBED_STATUS_FAILED,
    EMBED_STATUS_INDEXED,
    EMBED_STATUS_PENDING,
    EmbeddedDocumentModel,
    EmbeddingIndexModel,
)
from app.schemas import (
    EmbedDocumentsInput,
    EmbeddedDocument,
    EmbeddingIndex,
    EmbeddingIndexesResponse,
)
from app.services import chunking, documents as document_service
from app.services.embeddings import EMBEDDING_MODEL, embed_query, embed_texts
from app.services import vector_store


def _format_utc(dt) -> str:
    return document_service._format_utc(dt)  # noqa: SLF001


def _qdrant_collection_name(index_id: str) -> str:
    return f"idx_{index_id.replace('-', '')}"


def _get_document_title(db: Session, user_id: str, document_id: str) -> str:
    row = db.scalar(
        select(DocumentModel.title).where(
            DocumentModel.id == document_id,
            DocumentModel.user_id == user_id,
        )
    )
    return row or document_id


def _to_embedded_document(
    row: EmbeddedDocumentModel,
    *,
    title: str,
) -> EmbeddedDocument:
    return EmbeddedDocument(
        id=row.id,
        documentId=row.document_id,
        title=title,
        chunkCount=row.chunk_count,
        status=row.status,
        errorMessage=row.error_message,
        embeddedAt=_format_utc(row.embedded_at) if row.embedded_at else None,
        createdAt=_format_utc(row.created_at),
        updatedAt=_format_utc(row.updated_at),
    )


def _to_embedding_index(
    db: Session,
    user_id: str,
    index: EmbeddingIndexModel,
    embedded_rows: list[EmbeddedDocumentModel],
) -> EmbeddingIndex:
    documents: list[EmbeddedDocument] = []
    for row in embedded_rows:
        title = _get_document_title(db, user_id, row.document_id)
        documents.append(_to_embedded_document(row, title=title))

    return EmbeddingIndex(
        id=index.id,
        embeddingModel=index.embedding_model,
        qdrantCollection=index.qdrant_collection,
        documents=documents,
        documentCount=len(documents),
        indexedCount=sum(1 for doc in documents if doc.status == EMBED_STATUS_INDEXED),
        createdAt=_format_utc(index.created_at),
        updatedAt=_format_utc(index.updated_at),
    )


def _embedded_document_count(db: Session, index_id: str) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(EmbeddedDocumentModel)
            .where(EmbeddedDocumentModel.index_id == index_id)
        )
        or 0
    )


def _get_user_index(db: Session, user_id: str) -> EmbeddingIndexModel | None:
    indexes = db.scalars(
        select(EmbeddingIndexModel).where(
            EmbeddingIndexModel.user_id == user_id,
            EmbeddingIndexModel.embedding_model == EMBEDDING_MODEL,
        )
    ).all()
    if not indexes:
        return None
    if len(indexes) == 1:
        return indexes[0]

    return max(
        indexes,
        key=lambda index: (_embedded_document_count(db, index.id), index.updated_at),
    )


def _get_user_indexes(db: Session, user_id: str) -> list[EmbeddingIndexModel]:
    return list(
        db.scalars(
            select(EmbeddingIndexModel).where(
                EmbeddingIndexModel.user_id == user_id,
                EmbeddingIndexModel.embedding_model == EMBEDDING_MODEL,
            )
        ).all()
    )


def _get_indexed_document_ids(db: Session, index_id: str) -> list[str]:
    return list(
        db.scalars(
            select(EmbeddedDocumentModel.document_id).where(
                EmbeddedDocumentModel.index_id == index_id,
                EmbeddedDocumentModel.status == EMBED_STATUS_INDEXED,
            )
        ).all()
    )


def _delete_document_vectors_for_user(
    db: Session,
    user_id: str,
    document_id: str,
) -> None:
    for index in _get_user_indexes(db, user_id):
        vector_store.delete_document_vectors(index.qdrant_collection, document_id=document_id)


def _get_or_create_index(db: Session, user_id: str) -> EmbeddingIndexModel:
    row = _get_user_index(db, user_id)
    if row:
        return row

    index_id = str(uuid4())
    now = EmbeddingIndexModel.utcnow()
    row = EmbeddingIndexModel(
        id=index_id,
        user_id=user_id,
        embedding_model=EMBEDDING_MODEL,
        qdrant_collection=_qdrant_collection_name(index_id),
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_embedding_indexes(db: Session, user_id: str) -> EmbeddingIndexesResponse:
    index = _get_user_index(db, user_id)
    if not index:
        return EmbeddingIndexesResponse(indexes=[])

    embedded_rows = db.scalars(
        select(EmbeddedDocumentModel)
        .where(EmbeddedDocumentModel.index_id == index.id)
        .order_by(EmbeddedDocumentModel.updated_at.desc())
    ).all()
    return EmbeddingIndexesResponse(indexes=[_to_embedding_index(db, user_id, index, embedded_rows)])


def _index_single_document(
    db: Session,
    *,
    user_id: str,
    index: EmbeddingIndexModel,
    document_id: str,
) -> EmbeddedDocument:
    settings = get_settings()
    now = EmbeddingIndexModel.utcnow()

    existing = db.scalar(
        select(EmbeddedDocumentModel).where(
            EmbeddedDocumentModel.index_id == index.id,
            EmbeddedDocumentModel.document_id == document_id,
        )
    )

    if existing is None:
        existing = EmbeddedDocumentModel(
            id=str(uuid4()),
            index_id=index.id,
            document_id=document_id,
            chunk_count=0,
            status=EMBED_STATUS_PENDING,
            error_message=None,
            embedded_at=None,
            created_at=now,
            updated_at=now,
        )
        db.add(existing)
        db.commit()
        db.refresh(existing)
    else:
        existing.status = EMBED_STATUS_PENDING
        existing.error_message = None
        existing.updated_at = now
        db.commit()

    title = _get_document_title(db, user_id, document_id)

    try:
        content_data = document_service.fetch_document_content(db, user_id, document_id)
        content = (content_data.get("content") or "").strip()
        if content_data.get("extract_error") or not content:
            raise ValueError(content_data.get("extract_error") or "추출할 텍스트가 없습니다.")

        chunks = chunking.split_text(
            content,
            chunk_size=settings.embedding_chunk_size,
            chunk_overlap=settings.embedding_chunk_overlap,
        )
        if not chunks:
            raise ValueError("임베딩할 텍스트 청크가 없습니다.")

        vector_store.ensure_collection(index.qdrant_collection)
        vector_store.delete_document_vectors(index.qdrant_collection, document_id=document_id)

        vectors = embed_texts(chunks)
        vector_store.upsert_document_chunks(
            index.qdrant_collection,
            index_id=index.id,
            user_id=user_id,
            document_id=document_id,
            title=content_data.get("title") or title,
            source_format=content_data.get("source_format") or "",
            chunks=chunks,
            vectors=vectors,
        )

        existing.chunk_count = len(chunks)
        existing.status = EMBED_STATUS_INDEXED
        existing.error_message = None
        existing.embedded_at = EmbeddingIndexModel.utcnow()
        existing.updated_at = existing.embedded_at
        index.updated_at = existing.embedded_at
        db.commit()
        db.refresh(existing)

    except Exception as exc:
        existing.status = EMBED_STATUS_FAILED
        existing.error_message = str(exc)
        existing.updated_at = EmbeddingIndexModel.utcnow()
        db.commit()
        db.refresh(existing)

    return _to_embedded_document(existing, title=title)


def embed_documents(db: Session, user_id: str, body: EmbedDocumentsInput) -> EmbeddingIndex:
    if not body.document_ids:
        raise HTTPException(status_code=400, detail="임베딩할 문서를 선택해 주세요.")

    for document_id in body.document_ids:
        document_service._get_document_row(db, user_id, document_id)  # noqa: SLF001

    index = _get_or_create_index(db, user_id)

    for document_id in body.document_ids:
        _index_single_document(db, user_id=user_id, index=index, document_id=document_id)

    db.refresh(index)
    embedded_rows = db.scalars(
        select(EmbeddedDocumentModel)
        .where(EmbeddedDocumentModel.index_id == index.id)
        .order_by(EmbeddedDocumentModel.updated_at.desc())
    ).all()
    return _to_embedding_index(db, user_id, index, embedded_rows)


def remove_embedded_document(
    db: Session,
    user_id: str,
    index_id: str,
    document_id: str,
) -> None:
    index = db.scalar(
        select(EmbeddingIndexModel).where(
            EmbeddingIndexModel.id == index_id,
            EmbeddingIndexModel.user_id == user_id,
        )
    )
    if not index:
        raise HTTPException(status_code=404, detail="임베딩 인덱스를 찾을 수 없습니다.")

    row = db.scalar(
        select(EmbeddedDocumentModel).where(
            EmbeddedDocumentModel.index_id == index_id,
            EmbeddedDocumentModel.document_id == document_id,
        )
    )
    if not row:
        raise HTTPException(status_code=404, detail="임베딩된 문서를 찾을 수 없습니다.")

    _delete_document_vectors_for_user(db, user_id, document_id)

    db.delete(row)
    index.updated_at = EmbeddingIndexModel.utcnow()
    db.commit()


def cleanup_document_embeddings(db: Session, user_id: str, document_id: str) -> None:
    embedded_rows = db.scalars(
        select(EmbeddedDocumentModel)
        .join(EmbeddingIndexModel)
        .where(
            EmbeddingIndexModel.user_id == user_id,
            EmbeddedDocumentModel.document_id == document_id,
        )
    ).all()

    if not embedded_rows:
        return

    _delete_document_vectors_for_user(db, user_id, document_id)

    for row in embedded_rows:
        db.delete(row)

    db.commit()


def search_embedded_documents(
    db: Session,
    user_id: str,
    query: str,
    *,
    top_k: int = 5,
) -> list[dict]:
    normalized_query = query.strip()
    if not normalized_query:
        return []

    index = _get_user_index(db, user_id)
    if not index:
        return []

    indexed_doc_ids = _get_indexed_document_ids(db, index.id)
    if not indexed_doc_ids:
        return []

    query_vector = embed_query(normalized_query)
    hits = vector_store.search_vectors(
        index.qdrant_collection,
        user_id=user_id,
        query_vector=query_vector,
        top_k=top_k,
        document_ids=indexed_doc_ids,
    )
    for hit in hits:
        doc_id = hit.get("document_id")
        if doc_id:
            hit["title"] = _get_document_title(db, user_id, doc_id)

    allowed_doc_ids = set(indexed_doc_ids)
    return [hit for hit in hits if hit.get("document_id") in allowed_doc_ids]
