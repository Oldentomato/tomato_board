export type GuideAgentSection = {
  id: string;
  title: string;
  body: string;
  bullets: string[];
};

export type GuideDocumentSection = {
  title: string;
  body: string;
  bullets: string[];
};

export const CHAT_GUIDE = {
  title: "AI 채팅 가이드",
  subtitle: "에이전트 선택과 문서 업로드 사용법을 확인하세요.",
  agents: [
    {
      id: "general",
      title: "일반 대화",
      body: "학습·기획·일상 질문용 기본 에이전트입니다. 최신 정보가 필요하면 웹 검색을 활용합니다.",
      bullets: [
        "에이전트 선택을 비워 두면 일반 대화로 동작합니다.",
        "시사·가격·날씨 등 시점에 민감한 질문은 웹 검색 후 답변합니다.",
      ],
    },
    {
      id: "document",
      title: "문서관리",
      body: "업로드한 문서의 변환·미리보기·내용 검색을 도와줍니다.",
      bullets: [
        "헤더의「문서」패널에서 파일을 올린 뒤 질문하세요.",
        "Word/한글 변환, 미리보기, 임베딩 문서 시맨틱 검색을 지원합니다.",
        "다운로드는 문서 패널의 다운로드 버튼을 사용하세요.",
      ],
    },
  ] satisfies GuideAgentSection[],
  documents: {
    title: "문서 업로드 · 임베딩",
    body: "지원 형식: md, txt, markdown, docx, hwpx, hwp, pdf",
    bullets: [
      "「문서」→ 목록 탭에서 파일을 업로드합니다.",
      "업로드한 문서는 문서관리 에이전트로 Word/한글 파일로 변환할 수 있습니다.",
      "내용 검색이 필요하면 임베딩 탭에서 문서를 선택해 인덱싱하세요.",
      "업로드만으로는 검색되지 않습니다. 임베딩 후 문서관리 에이전트에게 질문하세요.",
    ],
  } satisfies GuideDocumentSection,
  tips: {
    general: "일반 질문이라면「일반 대화」로, 내 문서 관련이면「문서관리」로 바꾸세요.",
    document: "지금 문서관리가 선택되어 있습니다. 문서 패널에서 업로드·임베딩 후 질문해 보세요.",
  },
} as const;
