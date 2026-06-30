from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from starlette.responses import Response

from app.database import get_db
from app.dependencies import require_user
from app.http_utils import attachment_content_disposition
from app.schemas import (
    ConvertDocumentInput,
    Document,
    DocumentsResponse,
    User,
    UserStorageInfo,
)
from app.services import documents as document_service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=DocumentsResponse)
async def list_documents(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(document_service.list_documents, db, user.id)


@router.get("/storage", response_model=UserStorageInfo)
async def get_storage_info(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(document_service.get_or_create_user_storage, db, user.id)


@router.post("", response_model=Document, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await document_service.upload_document(db, user.id, file, title)


@router.post("/convert", response_model=Document, status_code=201)
async def convert_document(
    body: ConvertDocumentInput,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(
        document_service.convert_and_save_document,
        db,
        user.id,
        body,
    )


@router.post("/{document_id}/convert", response_model=Document, status_code=201)
async def convert_existing_document(
    document_id: str,
    target_format: str = "docx",
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(
        document_service.convert_existing_document,
        db,
        user.id,
        document_id,
        target_format,
    )


@router.get("/{document_id}/file")
def download_document_file(
    document_id: str,
    use_output: bool = True,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    data, filename, mime_type = document_service.get_document_file(
        db,
        user.id,
        document_id,
        use_output=use_output,
    )
    return StreamingResponse(
        iter([data]),
        media_type=mime_type,
        headers={"Content-Disposition": attachment_content_disposition(filename)},
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    await run_in_threadpool(document_service.delete_document, db, user.id, document_id)
    return Response(status_code=204)
