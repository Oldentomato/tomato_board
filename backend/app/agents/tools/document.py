from __future__ import annotations

import json
from functools import lru_cache

from langchain_core.tools import tool

from fastapi import HTTPException

from app.agents.context import get_current_user_id
from app.database import SessionLocal
from app.schemas import ConvertDocumentInput
from app.services import documents as document_service


@tool
def get_user_storage_path() -> str:
    """MySQL에서 현재 사용자의 MinIO 문서 저장 경로(prefix)를 조회합니다."""
    user_id = get_current_user_id()
    db = SessionLocal()
    try:
        info = document_service.get_or_create_user_storage(db, user_id)
        return json.dumps(
            {
                "user_id": info.userId,
                "storage_prefix": info.storagePrefix,
                "message": f"문서는 MinIO의 '{info.storagePrefix}' 경로에 저장됩니다.",
            },
            ensure_ascii=False,
        )
    finally:
        db.close()


@tool
def list_user_documents() -> str:
    """현재 사용자가 업로드하거나 변환한 문서 목록을 조회합니다."""
    user_id = get_current_user_id()
    db = SessionLocal()
    try:
        response = document_service.list_documents(db, user_id)
        items = [
            {
                "id": doc.id,
                "title": doc.title,
                "status": doc.status,
                "source_format": doc.sourceFormat,
                "output_format": doc.outputFormat,
                "created_at": doc.createdAt,
            }
            for doc in response.documents
        ]
        return json.dumps({"documents": items, "count": len(items)}, ensure_ascii=False)
    finally:
        db.close()


@tool
def fetch_document_from_storage(document_id: str) -> str:
    """MySQL 메타데이터와 저장소에서 문서 텍스트를 추출해 가져옵니다 (md/txt/docx/hwpx/hwp 지원)."""
    user_id = get_current_user_id()
    db = SessionLocal()
    try:
        data = document_service.fetch_document_content_resolved(db, user_id, document_id)
        if data.get("error"):
            return json.dumps(data, ensure_ascii=False)
        preview = data["content"]
        if len(preview) > 4000:
            preview = preview[:4000] + "\n...(이하 생략)"
        return json.dumps({**data, "content": preview}, ensure_ascii=False)
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return json.dumps(
            {"document_id": document_id, "error": detail},
            ensure_ascii=False,
        )
    except Exception as exc:
        return json.dumps(
            {"document_id": document_id, "error": str(exc)},
            ensure_ascii=False,
        )
    finally:
        db.close()


@tool
def convert_content_to_document(
    content: str,
    title: str = "문서",
    target_format: str = "docx",
) -> str:
    """마크다운 또는 일반 텍스트를 Word(docx) 또는 한글(hwpx) 문서로 변환해 MinIO에 저장합니다."""
    user_id = get_current_user_id()
    db = SessionLocal()
    try:
        doc = document_service.convert_and_save_document(
            db,
            user_id,
            ConvertDocumentInput(content=content, title=title, target_format=target_format),
        )
        return json.dumps(
            {
                "document_id": doc.id,
                "title": doc.title,
                "output_format": doc.outputFormat,
                "status": doc.status,
                "message": f"'{doc.title}' 문서가 {doc.outputFormat} 형식으로 저장되었습니다.",
            },
            ensure_ascii=False,
        )
    finally:
        db.close()


@tool
def convert_uploaded_document(document_id: str, target_format: str = "docx") -> str:
    """이미 업로드된 문서를 Word(docx) 또는 한글(hwpx) 형식으로 변환합니다."""
    user_id = get_current_user_id()
    db = SessionLocal()
    try:
        resolved = document_service.resolve_document_id(db, user_id, document_id)
        if isinstance(resolved, dict):
            return json.dumps({"document_id": document_id, **resolved}, ensure_ascii=False)

        doc = document_service.convert_existing_document(db, user_id, resolved, target_format)
        payload = {
            "document_id": doc.id,
            "source_document_id": resolved,
            "title": doc.title,
            "output_format": doc.outputFormat,
            "status": doc.status,
            "message": (
                f"원본 문서는 그대로 두고 '{doc.title}' 문서를 "
                f"{doc.outputFormat} 형식으로 새로 만들었습니다."
            ),
        }
        if resolved != document_id:
            payload["resolved_from_stale_id"] = document_id
        return json.dumps(payload, ensure_ascii=False)
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return json.dumps(
            {"document_id": document_id, "error": detail},
            ensure_ascii=False,
        )
    finally:
        db.close()


@lru_cache
def get_document_tools():
    return [
        get_user_storage_path,
        list_user_documents,
        fetch_document_from_storage,
        convert_content_to_document,
        convert_uploaded_document,
    ]
