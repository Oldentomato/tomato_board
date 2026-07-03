from __future__ import annotations

import hashlib
import uuid
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from app.config import get_settings
from app.services.embeddings import EMBEDDING_DIMENSION

_client: QdrantClient | None = None


def get_qdrant_client() -> QdrantClient:
    global _client
    if _client is not None:
        return _client

    settings = get_settings()
    if not settings.qdrant_url.strip():
        raise RuntimeError("QDRANT_URL이 설정되지 않았습니다.")

    kwargs: dict[str, Any] = {"url": settings.qdrant_url, "check_compatibility": False}
    _client = QdrantClient(**kwargs)
    return _client


def ensure_collection(collection_name: str) -> None:
    client = get_qdrant_client()
    dimension = EMBEDDING_DIMENSION

    if client.collection_exists(collection_name):
        info = client.get_collection(collection_name)
        existing_size = info.config.params.vectors.size  # type: ignore[union-attr]
        if existing_size != dimension:
            raise ValueError(
                f"컬렉션 '{collection_name}'의 벡터 차원({existing_size})이 "
                f"기대 차원({dimension})과 일치하지 않습니다."
            )
        _ensure_payload_indexes(collection_name)
        return

    client.create_collection(
        collection_name=collection_name,
        vectors_config=qmodels.VectorParams(size=dimension, distance=qmodels.Distance.COSINE),
    )
    _ensure_payload_indexes(collection_name)


def _ensure_payload_indexes(collection_name: str) -> None:
    client = get_qdrant_client()
    for field_name in ("user_id", "document_id"):
        try:
            client.create_payload_index(
                collection_name=collection_name,
                field_name=field_name,
                field_schema=qmodels.PayloadSchemaType.KEYWORD,
            )
        except Exception:
            # 이미 인덱스가 있거나 서버가 지원하지 않는 경우 무시
            pass


def _document_id_filter(document_id: str) -> qmodels.Filter:
    return qmodels.Filter(
        must=[
            qmodels.FieldCondition(
                key="document_id",
                match=qmodels.MatchValue(value=document_id),
            )
        ]
    )


def count_document_vectors(collection_name: str, *, document_id: str) -> int:
    client = get_qdrant_client()
    if not client.collection_exists(collection_name):
        return 0
    return client.count(
        collection_name=collection_name,
        count_filter=_document_id_filter(document_id),
        exact=True,
    ).count


def _point_id(index_id: str, document_id: str, chunk_index: int) -> str:
    digest = hashlib.sha256(f"{index_id}:{document_id}:{chunk_index}".encode()).hexdigest()
    return str(uuid.UUID(digest[:32]))


def upsert_document_chunks(
    collection_name: str,
    *,
    index_id: str,
    user_id: str,
    document_id: str,
    title: str,
    source_format: str,
    chunks: list[str],
    vectors: list[list[float]],
) -> None:
    if len(chunks) != len(vectors):
        raise ValueError("chunks and vectors length mismatch")

    client = get_qdrant_client()
    points = [
        qmodels.PointStruct(
            id=_point_id(index_id, document_id, idx),
            vector=vector,
            payload={
                "user_id": user_id,
                "index_id": index_id,
                "document_id": document_id,
                "chunk_index": idx,
                "title": title,
                "source_format": source_format,
                "text": chunk,
            },
        )
        for idx, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True))
    ]

    if points:
        client.upsert(collection_name=collection_name, points=points)
        stored = client.count(
            collection_name=collection_name,
            count_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="document_id",
                        match=qmodels.MatchValue(value=document_id),
                    )
                ]
            ),
            exact=True,
        ).count
        if stored < len(points):
            raise RuntimeError(
                f"Qdrant에 벡터가 저장되지 않았습니다. (기대 {len(points)}개, 실제 {stored}개)"
            )


def delete_document_vectors(collection_name: str, *, document_id: str) -> None:
    client = get_qdrant_client()
    if not client.collection_exists(collection_name):
        return

    remaining = count_document_vectors(collection_name, document_id=document_id)
    if remaining == 0:
        return

    client.delete(
        collection_name=collection_name,
        points_selector=qmodels.FilterSelector(filter=_document_id_filter(document_id)),
        wait=True,
    )

    still_remaining = count_document_vectors(collection_name, document_id=document_id)
    if still_remaining > 0:
        raise RuntimeError(
            f"Qdrant에서 문서 벡터를 삭제하지 못했습니다. "
            f"(collection={collection_name}, document_id={document_id}, remaining={still_remaining})"
        )


def delete_collection(collection_name: str) -> None:
    client = get_qdrant_client()
    if client.collection_exists(collection_name):
        client.delete_collection(collection_name)


def search_vectors(
    collection_name: str,
    *,
    user_id: str,
    query_vector: list[float],
    top_k: int = 5,
    document_ids: list[str] | None = None,
) -> list[dict[str, Any]]:
    client = get_qdrant_client()
    if not client.collection_exists(collection_name):
        return []

    must: list[qmodels.Condition] = [
        qmodels.FieldCondition(key="user_id", match=qmodels.MatchValue(value=user_id)),
    ]
    if document_ids:
        must.append(
            qmodels.FieldCondition(
                key="document_id",
                match=qmodels.MatchAny(any=document_ids),
            )
        )

    results = client.query_points(
        collection_name=collection_name,
        query=query_vector,
        query_filter=qmodels.Filter(must=must),
        limit=top_k,
        with_payload=True,
    )

    hits: list[dict[str, Any]] = []
    for hit in results.points:
        payload = hit.payload or {}
        hits.append(
            {
                "score": hit.score,
                "document_id": payload.get("document_id"),
                "title": payload.get("title"),
                "chunk_index": payload.get("chunk_index"),
                "source_format": payload.get("source_format"),
                "text": payload.get("text", ""),
            }
        )
    return hits
