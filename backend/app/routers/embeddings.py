from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from starlette.responses import Response

from app.database import get_db
from app.dependencies import require_user
from app.schemas import (
    EmbedDocumentsInput,
    EmbeddingIndex,
    EmbeddingIndexesResponse,
    User,
)
from app.services import rag as rag_service

router = APIRouter(prefix="/embeddings", tags=["embeddings"])


@router.get("", response_model=EmbeddingIndexesResponse)
async def list_indexes(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(rag_service.list_embedding_indexes, db, user.id)


@router.post("/embed", response_model=EmbeddingIndex)
async def embed_documents(
    body: EmbedDocumentsInput,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(rag_service.embed_documents, db, user.id, body)


@router.delete("/{index_id}/documents/{document_id}")
async def remove_embedded_document(
    index_id: str,
    document_id: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    await run_in_threadpool(
        rag_service.remove_embedded_document,
        db,
        user.id,
        index_id,
        document_id,
    )
    return Response(status_code=204)
