from __future__ import annotations

from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.schemas import ConvertDocumentInput
from app.services import documents as document_service


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def test_get_or_create_user_storage(db_session):
    info = document_service.get_or_create_user_storage(db_session, "user-1")
    assert info.userId == "user-1"
    assert info.storagePrefix == "users/user-1/"

    again = document_service.get_or_create_user_storage(db_session, "user-1")
    assert again.storagePrefix == info.storagePrefix


@patch("app.services.documents.storage")
def test_convert_and_save_document(mock_storage, db_session):
    mock_storage.ensure_bucket.return_value = None
    mock_storage.upload_bytes.return_value = None

    doc = document_service.convert_and_save_document(
        db_session,
        "user-1",
        ConvertDocumentInput(
            content="# 제목\n\n본문 **강조**",
            title="테스트 문서",
            target_format="docx",
        ),
    )

    assert doc.title == "테스트 문서"
    assert doc.outputFormat == "docx"
    assert doc.status == "converted"
    assert mock_storage.upload_bytes.call_count == 2


@patch("app.services.documents.storage")
def test_get_document_file(mock_storage, db_session):
    mock_storage.ensure_bucket.return_value = None
    mock_storage.upload_bytes.return_value = None
    mock_storage.download_bytes.return_value = b"file-bytes"

    doc = document_service.convert_and_save_document(
        db_session,
        "user-1",
        ConvertDocumentInput(content="hello", title="다운로드 테스트", target_format="docx"),
    )

    data, filename, mime_type = document_service.get_document_file(db_session, "user-1", doc.id)
    assert data == b"file-bytes"
    assert filename == "다운로드 테스트.docx"
    assert mime_type
    mock_storage.download_bytes.assert_called_once()


@patch("app.services.documents.storage")
def test_get_document_file_falls_back_to_source(mock_storage, db_session):
    mock_storage.ensure_bucket.return_value = None
    mock_storage.upload_bytes.return_value = None
    mock_storage.download_bytes.side_effect = [FileNotFoundError("missing output"), b"source-bytes"]

    doc = document_service.convert_and_save_document(
        db_session,
        "user-1",
        ConvertDocumentInput(content="hello", title="fallback", target_format="docx"),
    )

    data, filename, _mime = document_service.get_document_file(
        db_session,
        "user-1",
        doc.id,
        use_output=True,
    )
    assert data == b"source-bytes"
    assert filename == "fallback.docx"
    assert mock_storage.download_bytes.call_count == 2


def test_extract_hwpx_text():
    from app.services.document_convert import extract_hwpx_text, markdown_to_hwpx

    hwpx = markdown_to_hwpx("# 제목\n\n본문 내용입니다.")
    text = extract_hwpx_text(hwpx)
    assert "제목" in text
    assert "본문" in text


def test_extract_docx_text():
    from app.services.document_convert import extract_text_from_bytes, markdown_to_docx

    docx = markdown_to_docx("# 제목\n\n본문 내용입니다.", title="테스트")
    text = extract_text_from_bytes(docx, "docx")
    assert "제목" in text
    assert "본문" in text


def test_extract_hwpx_routes_legacy_hwp_bytes_to_hwp_extractor():
    from unittest.mock import patch

    from app.services.document_convert import extract_hwpx_text

    ole_header = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 100
    with patch("app.services.document_convert.extract_hwp_text", return_value="hwp text") as mock_extract:
        text = extract_hwpx_text(ole_header)
    assert text == "hwp text"
    mock_extract.assert_called_once_with(ole_header)


@patch("app.services.document_convert.extract_hwp_text")
@patch("app.services.documents.storage")
def test_fetch_document_content_reads_legacy_hwp(mock_storage, mock_extract_hwp, db_session):
    from app.models.document import DocumentModel

    mock_storage.download_bytes.return_value = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 100
    mock_extract_hwp.return_value = "개인훈련계획서 본문"

    row = DocumentModel(
        id="doc-hwp",
        user_id="user-1",
        title="(2025)개인훈련계획서",
        original_filename="report.hwp",
        source_format="hwp",
        output_format=None,
        source_object_key="users/user-1/documents/doc-hwp/source/report.hwp",
        output_object_key=None,
        status="uploaded",
        file_size=108,
        mime_type="application/x-hwp",
        error_message=None,
        created_at=DocumentModel.utcnow(),
        updated_at=DocumentModel.utcnow(),
    )
    db_session.add(row)
    db_session.commit()

    result = document_service.fetch_document_content(db_session, "user-1", "doc-hwp")
    assert result["content"] == "개인훈련계획서 본문"
    mock_extract_hwp.assert_called_once()


@patch("app.services.documents.storage")
def test_convert_existing_document_creates_new_document(mock_storage, db_session):
    from app.models.document import DocumentModel

    mock_storage.ensure_bucket.return_value = None
    mock_storage.upload_bytes.return_value = None
    mock_storage.download_bytes.return_value = "# 원본\n\n본문".encode("utf-8")

    source = DocumentModel(
        id="source-doc",
        user_id="user-1",
        title="원본 문서",
        original_filename="source.md",
        source_format="markdown",
        output_format=None,
        source_object_key="users/user-1/documents/source-doc/source/source.md",
        output_object_key=None,
        status="uploaded",
        file_size=20,
        mime_type="text/markdown",
        error_message=None,
        created_at=DocumentModel.utcnow(),
        updated_at=DocumentModel.utcnow(),
    )
    db_session.add(source)
    db_session.commit()

    converted = document_service.convert_existing_document(
        db_session,
        "user-1",
        "source-doc",
        "docx",
    )

    db_session.refresh(source)
    assert source.status == "uploaded"
    assert source.output_object_key is None
    assert converted.id != "source-doc"
    assert converted.title == "원본 문서 (docx)"
    assert converted.outputFormat == "docx"
    assert converted.status == "converted"
    assert mock_storage.upload_bytes.call_count == 2


@patch("app.services.documents.storage")
def test_resolve_document_id_uses_single_remaining_document(mock_storage, db_session):
    from app.models.document import DocumentModel

    mock_storage.download_bytes.return_value = "# 새 문서\n\n내용".encode("utf-8")

    row = DocumentModel(
        id="new-doc-id",
        user_id="user-1",
        title="새 문서",
        original_filename="new.md",
        source_format="markdown",
        output_format=None,
        source_object_key="users/user-1/documents/new-doc-id/source/new.md",
        output_object_key=None,
        status="uploaded",
        file_size=20,
        mime_type="text/markdown",
        error_message=None,
        created_at=DocumentModel.utcnow(),
        updated_at=DocumentModel.utcnow(),
    )
    db_session.add(row)
    db_session.commit()

    resolved = document_service.resolve_document_id(
        db_session,
        "user-1",
        "deleted-old-id",
    )
    assert resolved == "new-doc-id"


@patch("app.services.documents.storage")
def test_fetch_document_content_resolved_from_stale_id(mock_storage, db_session):
    from app.models.document import DocumentModel

    mock_storage.download_bytes.return_value = "# 새 문서\n\n내용".encode("utf-8")

    row = DocumentModel(
        id="new-doc-id",
        user_id="user-1",
        title="새 문서",
        original_filename="new.md",
        source_format="markdown",
        output_format=None,
        source_object_key="users/user-1/documents/new-doc-id/source/new.md",
        output_object_key=None,
        status="uploaded",
        file_size=20,
        mime_type="text/markdown",
        error_message=None,
        created_at=DocumentModel.utcnow(),
        updated_at=DocumentModel.utcnow(),
    )
    db_session.add(row)
    db_session.commit()

    result = document_service.fetch_document_content_resolved(
        db_session,
        "user-1",
        "b6c5740c-c6d8-4edf-b930-1274fbe529a3",
    )
    assert result["document_id"] == "new-doc-id"
    assert result["resolved_from_stale_id"] == "b6c5740c-c6d8-4edf-b930-1274fbe529a3"
    assert "내용" in result["content"]
