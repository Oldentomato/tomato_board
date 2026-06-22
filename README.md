# Tomato Board

날씨, Gmail, 캘린더를 한 화면에서 확인하는 대시보드 앱입니다.

## 기술 스택

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- TanStack React Query
- date-fns

## 시작하기

### 1. 의존성 설치

```bash
cd frontend
npm install
```

### 2. 환경 변수 설정

`frontend/.env.local.example`을 복사해 `frontend/.env.local`을 만듭니다.

```bash
cp .env.local.example .env.local
```

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_API_URL` | 백엔드 API 서버 URL |
| `NEXT_PUBLIC_APP_URL` | 프론트엔드 URL (CORS/OAuth 리다이렉트용) |

### 3. 개발 서버 실행

**Mock 모드 (UI 미리보기, 백엔드 불필요)**

```bash
cd frontend
npm run local
```

- Mock 데이터로 날씨·메일·캘린더 표시
- "Mock 로그인" 버튼으로 즉시 대시보드 진입
- 캘린더 CRUD는 localStorage에 저장

**실제 백엔드 연동**

```bash
cd frontend
npm run dev
```

- `frontend/.env.local`에 `NEXT_PUBLIC_API_URL` 설정 필요
- Google OAuth 로그인 → 백엔드 API 호출

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

| 스크립트 | 모드 | 설명 |
|----------|------|------|
| `npm run local` | Mock | `NEXT_PUBLIC_USE_MOCK=true`, 화면 구성 확인용 |
| `npm run dev` | Real | 실제 서버 + Google 로그인 |

## 인증

Google OAuth는 **백엔드에 위임**합니다.

1. `/login`에서 "Google로 로그인" 클릭
2. `{API_URL}/auth/google`로 리다이렉트
3. OAuth 완료 후 백엔드가 httpOnly 세션 쿠키 설정
4. `/dashboard`로 리다이렉트

## API 계약 (백엔드 가정)

프론트 API 클라이언트는 `src/lib/api/`에 있습니다. 백엔드 스펙이 다르면 해당 파일과 `src/lib/types/`만 수정하면 됩니다.

### Auth

| Method | Path | 설명 |
|--------|------|------|
| GET | `/auth/google` | Google OAuth 시작 |
| GET | `/auth/me` | 현재 사용자 `{ id, email, name, picture }` |
| POST | `/auth/logout` | 로그아웃 |

### Weather

| Method | Path | 설명 |
|--------|------|------|
| GET | `/weather/today` | 오늘 날씨 |
| GET | `/weather/week` | 7일 예보 `{ days: [...] }` |

### Mail (Gmail)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/mail/summary` | `{ unreadCount, recent: MailMessage[] }` |
| GET | `/mail/messages?page&limit` | `{ messages, total }` |

### Calendar

| Method | Path | 설명 |
|--------|------|------|
| GET | `/calendar/events?from&to` | 일정 목록 |
| POST | `/calendar/events` | 일정 생성 |
| PUT | `/calendar/events/:id` | 일정 수정 |
| DELETE | `/calendar/events/:id` | 일정 삭제 |

## 백엔드 연동 체크리스트

1. `NEXT_PUBLIC_API_URL` 설정
2. CORS: `NEXT_PUBLIC_APP_URL` origin + `credentials: true` 허용
3. OAuth 콜백 후 httpOnly 세션 쿠키 설정 및 `/dashboard` 리다이렉트
4. Google OAuth scope에 Gmail 읽기 권한 포함
5. API 응답 필드명이 다르면 타입/mapper 수정

## 프로젝트 구조

```
frontend/                 # Next.js
├── src/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── lib/
backend/                  # FastAPI
nginx/
```
