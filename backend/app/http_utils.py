from __future__ import annotations

from urllib.parse import quote


def attachment_content_disposition(filename: str) -> str:
    """HTTP 헤더용 Content-Disposition (한글 등 비 ASCII 파일명 지원)."""
    try:
        filename.encode("latin-1")
        return f'attachment; filename="{filename}"'
    except UnicodeEncodeError:
        ascii_fallback = "".join(ch if ord(ch) < 128 else "_" for ch in filename).strip("._") or "download"
        encoded = quote(filename, safe="")
        return f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{encoded}"
