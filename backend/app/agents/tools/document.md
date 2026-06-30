# document 에이전트 도구

`document` 에이전트(`app/agents/document/graph.py`)에 연결된 LangChain 도구 목록입니다.  
구현: `app/agents/tools/document.py` — **도구 5개**

모든 도구는 **현재 로그인 사용자**만 접근합니다 (`user_id`는 세션에서 자동 주입).  
반환값은 모두 **JSON 문자열**입니다.

## 저장소 역할

| 계층 | 역할 |
|------|------|
| MySQL (`documents`, `user_storage`) | 목록, 메타데이터, `object_key`, `status` |
| MinIO / 로컬 파일 (`.local_storage/`) | 실제 파일 바이너리 |

---

## 1. `get_user_storage_path`

**용도**  
현재 사용자의 문서 저장 경로(prefix)를 조회합니다. MySQL `user_storage` 테이블에서 읽고, 없으면 생성합니다.

**입력**  
없음

**출력** (JSON)

```json
{
  "user_id": "google-user-id",
  "storage_prefix": "users/{user_id}/",
  "message": "문서는 MinIO의 'users/.../' 경로에 저장됩니다."
}
```

---

## 2. `list_user_documents`

**용도**  
현재 사용자가 업로드하거나 변환한 문서 목록을 조회합니다. **MySQL** `documents` 테이블을 조회하며, MinIO를 직접 나열하지 않습니다.

**입력**  
없음

**출력** (JSON)

```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "문서 제목",
      "status": "uploaded | converted | failed",
      "source_format": "markdown | txt | docx | hwpx | ...",
      "output_format": "docx | hwpx | null",
      "created_at": "2026-06-30T12:00:00Z"
    }
  ],
  "count": 1
}
```

---

## 3. `fetch_document_from_storage`

**용도**  
문서 본문 텍스트를 추출해 가져옵니다. DB에서 메타데이터를 확인한 뒤 저장소에서 파일을 읽고 형식에 맞게 텍스트로 변환합니다.

**입력**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `document_id` | `str` | O | 문서 UUID |

**출력** (JSON)

```json
{
  "document_id": "uuid",
  "title": "문서 제목",
  "source_format": "markdown",
  "output_format": "hwpx",
  "content_format": "markdown | docx | hwpx | ...",
  "status": "converted",
  "content": "추출된 본문 텍스트 (최대 4000자, 초과 시 '...(이하 생략)')",
  "file_size": 12345,
  "object_key": "users/.../documents/.../source/content.md"
}
```

**텍스트 추출 규칙**

| 형식 | 처리 |
|------|------|
| `md`, `txt`, `markdown` | UTF-8 텍스트 그대로 |
| `docx` | `python-docx`로 단락 추출 |
| `hwpx`, `hwp` | ZIP 내 `Preview/PrvText.txt` 또는 `section0.xml`에서 추출 |
| AI 변환 문서 | 원본 `content.md` 우선 사용 |

---

## 4. `convert_content_to_document`

**용도**  
채팅에 있는 마크다운·텍스트를 Word 또는 한글 문서로 변환해 저장소에 저장하고, MySQL에 메타데이터를 기록합니다.

**입력**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `content` | `str` | O | — | 변환할 본문 (마크다운·일반 텍스트) |
| `title` | `str` | X | `"문서"` | 문서 제목 |
| `target_format` | `str` | X | `"docx"` | `docx`, `word`, `hwpx`, `hwp`, `한글` 등 |

**출력** (JSON)

```json
{
  "document_id": "uuid",
  "title": "문서 제목",
  "output_format": "docx | hwpx",
  "status": "converted",
  "message": "'문서 제목' 문서가 docx 형식으로 저장되었습니다."
}
```

저장 시 원본 마크다운(`source`)과 변환 파일(`output`)이 모두 저장소에 기록됩니다.

---

## 5. `convert_uploaded_document`

**용도**  
UI 등으로 이미 업로드된 문서를 Word 또는 한글 형식으로 변환합니다.

**입력**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `document_id` | `str` | O | — | 문서 UUID |
| `target_format` | `str` | X | `"docx"` | `docx`, `hwpx` 등 |

**출력** (JSON)

```json
{
  "document_id": "uuid",
  "title": "문서 제목",
  "output_format": "docx | hwpx",
  "status": "converted",
  "message": "문서가 hwpx 형식으로 변환되었습니다."
}
```

---

## 일반 워크플로

1. **목록** → `list_user_documents`
2. **내용 확인** → `fetch_document_from_storage`
3. **새로 저장/변환** → `convert_content_to_document` 또는 `convert_uploaded_document`
4. **다운로드** → 채팅 UI 문서 패널의 다운로드 버튼 (`GET /api/documents/{id}/file`)
5. **저장 경로 문의** → `get_user_storage_path`
