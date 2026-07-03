from __future__ import annotations

import json
from functools import lru_cache

from langchain_core.tools import tool

from app.agents.context import get_current_user_id
from app.database import SessionLocal
from app.services import rag as rag_service


@tool
def search_embedded_documents(query: str, top_k: int = 5) -> str:
    """임베딩된 문서에서 시맨틱 검색을 수행합니다."""
    user_id = get_current_user_id()
    db = SessionLocal()
    try:
        hits = rag_service.search_embedded_documents(
            db,
            user_id,
            query,
            top_k=max(1, min(top_k, 10)),
        )
        if not hits:
            indexes = rag_service.list_embedding_indexes(db, user_id).indexes
            indexed_total = sum(idx.indexedCount for idx in indexes)
            if indexed_total == 0:
                message = (
                    "검색 결과가 없습니다. 문서 패널의 임베딩 탭에서 "
                    "문서를 선택해 임베딩했는지 확인하세요."
                )
            else:
                message = (
                    "임베딩된 문서는 있지만 검색 결과가 없습니다. "
                    "문서를 다시 임베딩하거나, 질문을 더 구체적으로 해보세요."
                )
            return json.dumps(
                {
                    "query": query,
                    "results": [],
                    "embedded_document_count": indexed_total,
                    "message": message,
                },
                ensure_ascii=False,
            )

        return json.dumps(
            {
                "query": query,
                "result_count": len(hits),
                "results": hits,
            },
            ensure_ascii=False,
        )
    except Exception as exc:
        return json.dumps({"query": query, "error": str(exc)}, ensure_ascii=False)
    finally:
        db.close()


