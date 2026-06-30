from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import (
    DOCUMENT_STATUS_CONVERTED,
    DOCUMENT_STATUS_FAILED,
    DOCUMENT_STATUS_UPLOADED,
    DocumentModel,
    UserStorageModel,
)
from app.schemas import (
    ConvertDocumentInput,
    Document,
    DocumentsResponse,
    UserStorageInfo,
)
from app.services import document_convert, storage

FORMAT_EXTENSIONS = {
    "markdown": ".md",
    "md": ".md",
    "txt": ".txt",
    "text": ".txt",
    "docx": ".docx",
    "word": ".docx",
    "hwpx": ".hwpx",
    "hwp": ".hwpx",
}


def _format_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _detect_source_format(filename: str, content_type: str | None) -> str:
    suffix = Path(filename).suffix.lower().lstrip(".")
    if suffix in {"md", "markdown"}:
        return "markdown"
    if suffix in {"txt", "text"}:
        return "txt"
    if suffix == "docx":
        return "docx"
    if suffix == "hwpx":
        return "hwpx"
    if suffix == "hwp":
        return "hwp"
    if content_type and "markdown" in content_type:
        return "markdown"
    if content_type and "text" in content_type:
        return "txt"
    return suffix or "txt"


def _default_storage_prefix(user_id: str) -> str:
    return f"users/{user_id}/"


def get_or_create_user_storage(db: Session, user_id: str) -> UserStorageInfo:
    row = db.get(UserStorageModel, user_id)
    if row is None:
        now = DocumentModel.utcnow()
        prefix = _default_storage_prefix(user_id)
        row = UserStorageModel(
            user_id=user_id,
            storage_prefix=prefix,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    return UserStorageInfo(
        userId=row.user_id,
        storagePrefix=row.storage_prefix,
        createdAt=_format_utc(row.created_at),
        updatedAt=_format_utc(row.updated_at),
    )


def _to_document(row: DocumentModel) -> Document:
    return Document(
        id=row.id,
        title=row.title,
        originalFilename=row.original_filename,
        sourceFormat=row.source_format,
        outputFormat=row.output_format,
        status=row.status,
        fileSize=row.file_size,
        mimeType=row.mime_type,
        errorMessage=row.error_message,
        createdAt=_format_utc(row.created_at),
        updatedAt=_format_utc(row.updated_at),
    )


def _get_document_row(db: Session, user_id: str, document_id: str) -> DocumentModel:
    row = db.scalar(
        select(DocumentModel).where(
            DocumentModel.id == document_id,
            DocumentModel.user_id == user_id,
        )
    )
    if not row:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    return row


def _document_exists(db: Session, user_id: str, document_id: str) -> bool:
    row = db.scalar(
        select(DocumentModel.id).where(
            DocumentModel.id == document_id,
            DocumentModel.user_id == user_id,
        )
    )
    return row is not None


def resolve_document_id(db: Session, user_id: str, document_id: str) -> str | dict:
    """존재하는 document_id를 반환하거나, 삭제·재업로드로 ID가 바뀐 경우 대체 ID/안내를 반환합니다."""
    if _document_exists(db, user_id, document_id):
        return document_id

    docs = list_documents(db, user_id).documents
    if len(docs) == 1:
        return docs[0].id

    return {
        "error": (
            "문서를 찾을 수 없습니다. 문서 패널에서 삭제 후 다시 업로드하면 document_id가 바뀝니다. "
            "list_user_documents로 최신 목록을 확인하세요."
        ),
        "stale_document_id": document_id,
        "available_documents": [{"id": doc.id, "title": doc.title} for doc in docs],
    }


def fetch_document_content_resolved(db: Session, user_id: str, document_id: str) -> dict:
    resolved = resolve_document_id(db, user_id, document_id)
    if isinstance(resolved, dict):
        return {"document_id": document_id, **resolved}

    data = fetch_document_content(db, user_id, resolved)
    if resolved != document_id:
        data["resolved_from_stale_id"] = document_id
        data["document_id"] = resolved
    return data


def list_documents(db: Session, user_id: str) -> DocumentsResponse:
    rows = db.scalars(
        select(DocumentModel)
        .where(DocumentModel.user_id == user_id)
        .order_by(DocumentModel.created_at.desc())
    ).all()
    return DocumentsResponse(documents=[_to_document(row) for row in rows])


async def upload_document(
    db: Session,
    user_id: str,
    file: UploadFile,
    title: str | None = None,
) -> Document:
    storage.ensure_bucket()
    storage_info = get_or_create_user_storage(db, user_id)

    filename = file.filename or "document.txt"
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="빈 파일은 업로드할 수 없습니다.")

    document_id = str(uuid4())
    source_format = _detect_source_format(filename, file.content_type)
    object_key = f"{storage_info.storagePrefix}documents/{document_id}/source/{filename}"

    storage.upload_bytes(
        object_key,
        data,
        content_type=file.content_type or "application/octet-stream",
    )

    now = DocumentModel.utcnow()
    row = DocumentModel(
        id=document_id,
        user_id=user_id,
        title=(title or Path(filename).stem).strip() or "문서",
        original_filename=filename,
        source_format=source_format,
        output_format=None,
        source_object_key=object_key,
        output_object_key=None,
        status=DOCUMENT_STATUS_UPLOADED,
        file_size=len(data),
        mime_type=file.content_type or "application/octet-stream",
        error_message=None,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_document(row)


def fetch_document_content(db: Session, user_id: str, document_id: str) -> dict:
    row = _get_document_row(db, user_id, document_id)

    candidates: list[tuple[str, str]] = []
    seen_keys: set[str] = set()

    def add_candidate(object_key: str | None, file_format: str | None) -> None:
        if not object_key or not file_format or object_key in seen_keys:
            return
        seen_keys.add(object_key)
        candidates.append((object_key, file_format))

    if row.source_format in document_convert.TEXT_FORMATS or row.source_object_key.endswith("content.md"):
        source_format = row.source_format if row.source_format in document_convert.TEXT_FORMATS else "markdown"
        add_candidate(row.source_object_key, source_format)

    add_candidate(row.output_object_key, row.output_format)
    add_candidate(row.source_object_key, row.source_format)

    errors: list[str] = []
    for object_key, file_format in candidates:
        try:
            data = storage.download_bytes(object_key)
            text = document_convert.extract_text_from_bytes(data, file_format)
            if text.strip():
                return {
                    "document_id": row.id,
                    "title": row.title,
                    "source_format": row.source_format,
                    "output_format": row.output_format,
                    "content_format": file_format,
                    "status": row.status,
                    "content": text,
                    "file_size": row.file_size,
                    "object_key": object_key,
                }
        except Exception as exc:
            errors.append(str(exc))

    if errors:
        message = errors[-1]
    else:
        message = "(이 문서에서 추출할 수 있는 텍스트가 없습니다.)"

    return {
        "document_id": row.id,
        "title": row.title,
        "source_format": row.source_format,
        "output_format": row.output_format,
        "content_format": row.source_format,
        "status": row.status,
        "content": message,
        "file_size": row.file_size,
        "object_key": row.source_object_key,
        "extract_error": errors[-1] if errors else None,
    }


def convert_and_save_document(
    db: Session,
    user_id: str,
    input_data: ConvertDocumentInput,
) -> Document:
    storage.ensure_bucket()
    storage_info = get_or_create_user_storage(db, user_id)

    content = input_data.content.strip()
    title = input_data.title.strip() or "문서"
    if not content:
        raise HTTPException(status_code=400, detail="변환할 내용이 비어 있습니다.")

    try:
        converted_bytes, output_format = document_convert.convert_content(
            content,
            input_data.target_format,
            title=title,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    document_id = str(uuid4())
    extension = FORMAT_EXTENSIONS.get(output_format, f".{output_format}")
    output_filename = f"{title}{extension}"
    output_object_key = f"{storage_info.storagePrefix}documents/{document_id}/output/{output_filename}"

    mime_type = document_convert.MIME_BY_FORMAT.get(output_format, "application/octet-stream")
    storage.upload_bytes(output_object_key, converted_bytes, content_type=mime_type)

    source_key = f"{storage_info.storagePrefix}documents/{document_id}/source/content.md"
    storage.upload_bytes(source_key, content.encode("utf-8"), content_type="text/markdown")

    now = DocumentModel.utcnow()
    row = DocumentModel(
        id=document_id,
        user_id=user_id,
        title=title,
        original_filename=output_filename,
        source_format="markdown",
        output_format=output_format,
        source_object_key=source_key,
        output_object_key=output_object_key,
        status=DOCUMENT_STATUS_CONVERTED,
        file_size=len(converted_bytes),
        mime_type=mime_type,
        error_message=None,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_document(row)


def convert_existing_document(
    db: Session,
    user_id: str,
    document_id: str,
    target_format: str,
) -> Document:
    row = _get_document_row(db, user_id, document_id)
    fetched = fetch_document_content(db, user_id, document_id)

    content = fetched.get("content", "").strip()
    if fetched.get("extract_error") or not content:
        raise HTTPException(
            status_code=400,
            detail=fetched.get("extract_error") or "변환할 내용을 추출할 수 없습니다.",
        )

    normalized = target_format.lower().strip()
    format_label = "docx" if normalized in {"docx", "word"} else "hwpx"
    if normalized in {"hwp", "hwpx", "한글"}:
        format_label = "hwpx"

    return convert_and_save_document(
        db,
        user_id,
        ConvertDocumentInput(
            content=content,
            title=f"{row.title} ({format_label})",
            target_format=target_format,
        ),
    )


def get_document_file(
    db: Session,
    user_id: str,
    document_id: str,
    *,
    use_output: bool = True,
) -> tuple[bytes, str, str]:
    row = _get_document_row(db, user_id, document_id)

    candidates: list[tuple[str, str, str]] = []
    if use_output and row.output_object_key:
        output_filename = row.original_filename
        if row.output_format:
            extension = FORMAT_EXTENSIONS.get(row.output_format, f".{row.output_format}")
            output_filename = f"{row.title}{extension}"
        output_mime = document_convert.MIME_BY_FORMAT.get(
            row.output_format or "",
            row.mime_type or "application/octet-stream",
        )
        candidates.append((row.output_object_key, output_filename, output_mime))
    candidates.append(
        (row.source_object_key, row.original_filename, row.mime_type or "application/octet-stream")
    )

    seen_keys: set[str] = set()
    for object_key, filename, mime_type in candidates:
        if not object_key or object_key in seen_keys:
            continue
        seen_keys.add(object_key)
        try:
            data = storage.download_bytes(object_key)
        except FileNotFoundError:
            continue
        return data, filename, mime_type

    raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")


def delete_document(db: Session, user_id: str, document_id: str) -> None:
    row = _get_document_row(db, user_id, document_id)
    for key in (row.source_object_key, row.output_object_key):
        if key:
            try:
                storage.delete_object(key)
            except Exception:
                pass
    db.delete(row)
    db.commit()
