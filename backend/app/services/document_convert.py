from __future__ import annotations

import io
import os
import re
import tempfile
import zipfile
from xml.sax.saxutils import escape

from docx import Document
from docx.shared import Pt

HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+)$")
BULLET_PATTERN = re.compile(r"^[-*+]\s+(.+)$")
ORDERED_PATTERN = re.compile(r"^\d+\.\s+(.+)$")
BOLD_PATTERN = re.compile(r"\*\*(.+?)\*\*")
ITALIC_PATTERN = re.compile(r"(?<!\*)\*([^*]+)\*(?!\*)")


def _normalize_document_content(content: str) -> str:
    """문서 앞뒤의 빈 줄만 제거하고 본문 줄바꿈·공백은 유지합니다."""
    lines = content.splitlines()
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(lines)


def _leading_space_count(text: str) -> int:
    count = 0
    for char in text:
        if char == " ":
            count += 1
        elif char == "\t":
            count += 4
        else:
            break
    return count


def _set_paragraph_left_indent(paragraph, spaces: int) -> None:
    if spaces > 0:
        paragraph.paragraph_format.left_indent = Pt(min(spaces, 60) * 6)


def _split_line_indent(raw_line: str) -> tuple[str, str]:
    line = raw_line.rstrip()
    body = line.lstrip()
    indent = line[: len(line) - len(body)]
    return indent, body


def _parse_markdown_line(raw_line: str) -> tuple[str, str, int]:
    """반환: (kind, text, heading_level). kind는 blank|heading|bullet|ordered|plain."""
    line = raw_line.rstrip()
    if not line.strip():
        return "blank", "", 0

    indent, body = _split_line_indent(line)

    heading = HEADING_PATTERN.match(body)
    if heading:
        level = min(len(heading.group(1)), 6)
        return "heading", heading.group(2).rstrip(), level

    bullet = BULLET_PATTERN.match(body)
    if bullet:
        return "bullet", f"{indent}{bullet.group(1).rstrip()}", 0

    ordered = ORDERED_PATTERN.match(body)
    if ordered:
        return "ordered", f"{indent}{ordered.group(1).rstrip()}", 0

    return "plain", line, 0


def _add_formatted_runs(paragraph, text: str) -> None:
    if not text:
        return

    parts: list[tuple[str, bool, bool]] = []
    remaining = text
    while remaining:
        bold_match = BOLD_PATTERN.search(remaining)
        italic_match = ITALIC_PATTERN.search(remaining)
        match = None
        if bold_match and (not italic_match or bold_match.start() <= italic_match.start()):
            match = ("bold", bold_match)
        elif italic_match:
            match = ("italic", italic_match)

        if not match:
            parts.append((remaining, False, False))
            break

        kind, found = match
        if found.start() > 0:
            parts.append((remaining[: found.start()], False, False))
        parts.append((found.group(1), kind == "bold", kind == "italic"))
        remaining = remaining[found.end() :]

    for segment, bold, italic in parts:
        run = paragraph.add_run(segment)
        run.bold = bold
        run.italic = italic


def markdown_to_docx(content: str, title: str = "문서") -> bytes:
    doc = Document()
    doc.add_heading(title, level=0)

    for raw_line in _normalize_document_content(content).splitlines():
        kind, text, heading_level = _parse_markdown_line(raw_line)
        if kind == "blank":
            doc.add_paragraph()
            continue

        if kind == "heading":
            doc.add_heading(text, level=heading_level)
            continue

        if kind == "bullet":
            indent, body = _split_line_indent(text)
            paragraph = doc.add_paragraph(style="List Bullet")
            _set_paragraph_left_indent(paragraph, _leading_space_count(indent))
            _add_formatted_runs(paragraph, body)
            continue

        if kind == "ordered":
            indent, body = _split_line_indent(text)
            paragraph = doc.add_paragraph(style="List Number")
            _set_paragraph_left_indent(paragraph, _leading_space_count(indent))
            _add_formatted_runs(paragraph, body)
            continue

        paragraph = doc.add_paragraph()
        _add_formatted_runs(paragraph, text)

    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def _hwpx_section_xml(paragraphs: list[str]) -> str:
    para_xml = []
    for text in paragraphs:
        safe = escape(text)
        para_xml.append(
            f'<hp:p><hp:run><hp:t>{safe}</hp:t></hp:run></hp:p>'
        )
    body = "".join(para_xml) or '<hp:p><hp:run><hp:t></hp:t></hp:run></hp:p>'
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" '
        'xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">'
        f"{body}</hs:sec>"
    )


def markdown_to_hwpx(content: str, title: str = "문서") -> bytes:
    paragraphs: list[str] = [title]
    for raw_line in _normalize_document_content(content).splitlines():
        kind, text, _heading_level = _parse_markdown_line(raw_line)
        if kind == "blank":
            paragraphs.append("")
            continue
        if kind == "heading":
            paragraphs.append(text)
            continue
        if kind == "bullet":
            indent, body = _split_line_indent(text)
            paragraphs.append(f"{indent}• {body}")
            continue
        if kind == "ordered":
            indent, body = _split_line_indent(text)
            paragraphs.append(f"{indent}{body}")
            continue
        paragraphs.append(text)

    section_xml = _hwpx_section_xml(paragraphs)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("mimetype", "application/hwp+zip")
        archive.writestr(
            "version.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" '
            'tagetApplication="WORD_PROCESSOR" major="5" minor="1" micro="0" buildNumber="0"/>',
        )
        archive.writestr(
            "Contents/header.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" '
            'version="1.5" secCnt="1"><hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>'
            '<hh:refList><hh:fontfaces itemCnt="1"><hh:fontface lang="HANGUL" fontCnt="1">'
            '<hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/></hh:fontface></hh:fontfaces></hh:refList></hh:head>',
        )
        archive.writestr("Contents/section0.xml", section_xml)
        archive.writestr(
            "META-INF/container.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" '
            'ocf:version="1.0"><ocf:rootfiles><ocf:rootfile full-path="Contents/header.xml" '
            'media-type="application/hwpml+xml"/><ocf:rootfile full-path="Contents/section0.xml" '
            'media-type="application/hwpml+xml"/></ocf:rootfiles></ocf:container>',
        )
        archive.writestr(
            "META-INF/manifest.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" '
            'odf:version="1.2"><odf:file-entry odf:full-path="/" odf:media-type="application/hwp+zip"/>'
            '<odf:file-entry odf:full-path="Contents/header.xml" odf:media-type="application/hwpml+xml"/>'
            '<odf:file-entry odf:full-path="Contents/section0.xml" odf:media-type="application/hwpml+xml"/>'
            '</odf:manifest>',
        )
        preview = "\n".join(paragraphs[:20])
        archive.writestr("Preview/PrvText.txt", preview.encode("utf-8"))

    return buffer.getvalue()


def plain_text_to_docx(content: str, title: str = "문서") -> bytes:
    return markdown_to_docx(content, title=title)


MIME_BY_FORMAT = {
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "hwpx": "application/hwp+zip",
    "hwp": "application/x-hwp",
    "pdf": "application/pdf",
}


def convert_content(content: str, target_format: str, title: str = "문서") -> tuple[bytes, str]:
    normalized = target_format.lower().strip()
    if normalized in {"docx", "word"}:
        return markdown_to_docx(content, title=title), "docx"
    if normalized in {"hwp", "hwpx", "한글"}:
        return markdown_to_hwpx(content, title=title), "hwpx"
    raise ValueError(f"지원하지 않는 형식입니다: {target_format}. docx 또는 hwpx(한글)를 사용하세요.")


TEXT_FORMATS = frozenset({"markdown", "md", "txt", "text"})
BINARY_TEXT_FORMATS = frozenset({"docx", "word", "hwpx", "hwp", "pdf"})


def _decode_text_bytes(data: bytes) -> str:
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("utf-8", errors="replace")


def _is_zip_bytes(data: bytes) -> bool:
    return len(data) >= 2 and data[:2] == b"PK"


def _is_ole_bytes(data: bytes) -> bool:
    return len(data) >= 8 and data[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"


def _is_pdf_bytes(data: bytes) -> bool:
    return len(data) >= 4 and data[:4] == b"%PDF"


def extract_hwp_text(data: bytes) -> str:
    from hwpkit import extract_text_from_hwp

    with tempfile.NamedTemporaryFile(suffix=".hwp", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    try:
        text = _normalize_document_content(extract_text_from_hwp(tmp_path))
        if not text.strip():
            raise ValueError("한글 문서에서 추출할 수 있는 텍스트가 없습니다.")
        return text
    except Exception as exc:
        message = str(exc)
        if "OLE" in type(exc).__name__ or "ole" in message.lower():
            raise ValueError("올바른 한글(.hwp) 문서 파일이 아닙니다.") from exc
        raise ValueError(f"한글 문서를 읽을 수 없습니다: {message}") from exc
    finally:
        os.unlink(tmp_path)


def extract_docx_text(data: bytes) -> str:
    doc = Document(io.BytesIO(data))
    lines = [paragraph.text.rstrip() for paragraph in doc.paragraphs]
    return _normalize_document_content("\n".join(lines))


def extract_pdf_text(data: bytes) -> str:
    from pypdf import PdfReader

    if not _is_pdf_bytes(data):
        raise ValueError("올바른 PDF 문서 파일이 아닙니다.")

    try:
        reader = PdfReader(io.BytesIO(data))
        pages: list[str] = []
        for page in reader.pages:
            text = page.extract_text()
            pages.append(text.rstrip() if text else "")
    except Exception as exc:
        raise ValueError(f"PDF 문서를 읽을 수 없습니다: {exc}") from exc

    result = _normalize_document_content("\n\n".join(pages))
    if not result.strip():
        raise ValueError("PDF 문서에서 추출할 수 있는 텍스트가 없습니다.")
    return result


def extract_hwpx_text(data: bytes) -> str:
    if _is_ole_bytes(data):
        return extract_hwp_text(data)
    if not _is_zip_bytes(data):
        raise ValueError("올바른 한글(.hwpx) 문서 파일이 아닙니다.")

    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            preview_path = "Preview/PrvText.txt"
            if preview_path in archive.namelist():
                return _normalize_document_content(_decode_text_bytes(archive.read(preview_path)))

            section_path = "Contents/section0.xml"
            if section_path not in archive.namelist():
                return ""

            xml = archive.read(section_path).decode("utf-8", errors="replace")
            texts = re.findall(r"<hp:t>(.*?)</hp:t>", xml)
            unescaped = [t.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&") for t in texts]
            return _normalize_document_content("\n".join(unescaped))
    except zipfile.BadZipFile as exc:
        raise ValueError("한글 문서 파일을 읽을 수 없습니다. 파일이 손상되었을 수 있습니다.") from exc


def extract_text_from_bytes(data: bytes, file_format: str) -> str:
    normalized = file_format.lower().strip()
    if normalized in TEXT_FORMATS:
        return _normalize_document_content(_decode_text_bytes(data))
    if normalized in {"docx", "word"}:
        if not _is_zip_bytes(data):
            raise ValueError("올바른 Word(.docx) 문서 파일이 아닙니다.")
        return extract_docx_text(data)
    if normalized == "hwp":
        return extract_hwp_text(data)
    if normalized == "hwpx":
        return extract_hwpx_text(data)
    if normalized == "pdf":
        return extract_pdf_text(data)
    return _normalize_document_content(_decode_text_bytes(data))
