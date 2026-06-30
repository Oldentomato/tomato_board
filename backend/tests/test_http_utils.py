from app.http_utils import attachment_content_disposition


def test_attachment_content_disposition_ascii():
    header = attachment_content_disposition("report.docx")
    assert header == 'attachment; filename="report.docx"'


def test_attachment_content_disposition_unicode():
    header = attachment_content_disposition("테스트 문서.docx")
    assert "filename*=UTF-8''" in header
    assert "%ED%85%8C" in header
    header.encode("latin-1")
