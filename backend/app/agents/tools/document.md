# document 에이전트 도구

`document` (문서관리) 에이전트(`app/agents/document/graph.py`)에 연결된 LangChain 도구 목록입니다.  
구현: `app/agents/tools/document.py`, `app/agents/tools/rag.py` — **도구 6개**

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

## 3. `preview_document`

**용도**  
채팅 UI에 문서 미리보기 패널을 표시합니다. LLM에는 메타데이터만 전달하고, 실제 파일은 프론트엔드가 `GET /api/documents/{id}/file` 또는 `/content`로 로드합니다.

**입력**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `document_id` | `str` | O | 문서 UUID |

**출력** (JSON)

```json
{
  "document_id": "uuid",
  "title": "문서 제목",
  "source_format": "pdf",
  "output_format": null,
  "preview_format": "pdf",
  "preview_mode": "pdf | text | extracted_text",
  "use_output": false,
  "mime_type": "application/pdf",
  "file_size": 12345,
  "status": "uploaded",
  "message": "'문서 제목' 문서 미리보기를 채팅에 표시했습니다."
}
```

**미리보기 모드**

| `preview_mode` | UI 처리 |
|----------------|---------|
| `pdf` | PDF 뷰어 (`/file` blob) |
| `text` | 텍스트 패널 (`/file` blob) |
| `extracted_text` | 추출 텍스트 패널 (`/content` API) |

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

## 6. `search_embedded_documents`

**용도**  
Qdrant에 임베딩된 문서에서 시맨틱 검색을 수행합니다. 문서 패널 임베딩 탭에서 인덱싱한 문서만 검색 대상입니다.

**입력**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `query` | `str` | O | — | 검색 질문 |
| `top_k` | `int` | X | `5` | 반환할 청크 수 (1~10) |

**출력** (JSON)

```json
{
  "query": "검색 질문",
  "result_count": 3,
  "results": [
    {
      "score": 0.85,
      "document_id": "uuid",
      "title": "문서 제목",
      "text": "관련 청크 내용..."
    }
  ]
}
```

검색 결과가 없으면 임베딩 여부 안내 메시지가 포함됩니다.

---

## 일반 워크플로

1. **목록** → `list_user_documents`
2. **미리보기** → `preview_document`
3. **새로 저장/변환** → `convert_content_to_document` 또는 `convert_uploaded_document`
4. **임베딩 문서 검색** → `search_embedded_documents`
5. **다운로드** → 채팅 UI 문서 패널의 다운로드 버튼 (`GET /api/documents/{id}/file`)
6. **저장 경로 문의** → `get_user_storage_path`
