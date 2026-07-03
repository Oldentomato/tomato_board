from __future__ import annotations

from functools import lru_cache

from langchain_openai import OpenAIEmbeddings

from app.config import get_settings

EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSION = 3072


@lru_cache
def _get_embeddings_client() -> OpenAIEmbeddings:
    settings = get_settings()
    if not settings.openai_api_key.strip():
        raise RuntimeError("OPENAI_API_KEY가 설정되지 않았습니다.")
    return OpenAIEmbeddings(
        model=EMBEDDING_MODEL,
        api_key=settings.openai_api_key,
    )


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    return _get_embeddings_client().embed_documents(texts)


def embed_query(query: str) -> list[float]:
    return _get_embeddings_client().embed_query(query)
