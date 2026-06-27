import type { ChatGraph, ChatMessageNode, ChatRoom } from "@/lib/types/chat";

function node(
  id: string,
  role: ChatMessageNode["role"],
  content: string,
  parentId: string | null,
  childIds: string[],
  createdAt: string,
): ChatMessageNode {
  return { id, role, content, parentId, childIds, createdAt };
}

const room1Graph: ChatGraph = {
  roomId: "room-1",
  rootId: "n-root",
  nodes: {
    "n-root": node(
      "n-root",
      "system",
      "대화 세션이 시작되었습니다.",
      null,
      ["n-u1"],
      "2026-06-27T09:00:00.000Z",
    ),
    "n-u1": node(
      "n-u1",
      "user",
      "Next.js에서 CopilotKit을 어떻게 연동하나요?",
      "n-root",
      ["n-a1"],
      "2026-06-27T09:01:00.000Z",
    ),
    "n-a1": node(
      "n-a1",
      "assistant",
      "CopilotKit Provider로 앱을 감싸고, runtime API route를 구성하면 됩니다. AG-UI 프로토콜 기반 에이전트도 같은 구조로 연결할 수 있어요.",
      "n-u1",
      ["n-u2a", "n-u2b"],
      "2026-06-27T09:01:30.000Z",
    ),
    "n-u2a": node(
      "n-u2a",
      "user",
      "AG-UI 에이전트 연결 방법을 더 알려줘",
      "n-a1",
      ["n-a2a"],
      "2026-06-27T09:05:00.000Z",
    ),
    "n-a2a": node(
      "n-a2a",
      "assistant",
      "HttpAgent로 AG-UI 호환 백엔드 URL을 등록하고, CopilotRuntime agents 설정에 추가하면 됩니다.",
      "n-u2a",
      [],
      "2026-06-27T09:05:20.000Z",
    ),
    "n-u2b": node(
      "n-u2b",
      "user",
      "대화 분기는 Neo4j로 어떻게 저장해?",
      "n-a1",
      ["n-a2b"],
      "2026-06-27T09:06:00.000Z",
    ),
    "n-a2b": node(
      "n-a2b",
      "assistant",
      "각 메시지를 노드로, PARENT_OF 관계로 트리를 구성합니다. 분기 시 기존 노드에서 새 자식 노드를 추가하면 됩니다.",
      "n-u2b",
      [],
      "2026-06-27T09:06:15.000Z",
    ),
  },
};

const room2Graph: ChatGraph = {
  roomId: "room-2",
  rootId: "n2-root",
  nodes: {
    "n2-root": node(
      "n2-root",
      "system",
      "대화 세션이 시작되었습니다.",
      null,
      ["n2-u1"],
      "2026-06-27T08:00:00.000Z",
    ),
    "n2-u1": node(
      "n2-u1",
      "user",
      "오늘 날씨 기반 대시보드 테마는 어떻게 동작해?",
      "n2-root",
      ["n2-a1"],
      "2026-06-27T08:01:00.000Z",
    ),
    "n2-a1": node(
      "n2-a1",
      "assistant",
      "Weather API 아이콘 코드를 skyTheme으로 매핑해 gradient와 텍스트 색상을 결정합니다.",
      "n2-u1",
      [],
      "2026-06-27T08:01:20.000Z",
    ),
  },
};

export const MOCK_CHAT_ROOMS: ChatRoom[] = [
  {
    id: "room-1",
    title: "CopilotKit 연동",
    updatedAt: "2026-06-27T09:06:15.000Z",
    preview: "대화 분기는 Neo4j로 어떻게 저장해?",
  },
  {
    id: "room-2",
    title: "대시보드 테마",
    updatedAt: "2026-06-27T08:01:20.000Z",
    preview: "Weather API 아이콘 코드를 skyTheme으로...",
  },
];

export const MOCK_CHAT_GRAPHS: Record<string, ChatGraph> = {
  "room-1": room1Graph,
  "room-2": room2Graph,
};

export function createEmptyGraph(roomId: string): ChatGraph {
  const rootId = `${roomId}-root`;
  return {
    roomId,
    rootId,
    nodes: {
      [rootId]: node(
        rootId,
        "system",
        "새 대화가 시작되었습니다.",
        null,
        [],
        new Date().toISOString(),
      ),
    },
  };
}

export function createRoomId() {
  return `room-${crypto.randomUUID().slice(0, 8)}`;
}

export function createNodeId() {
  return `n-${crypto.randomUUID().slice(0, 8)}`;
}
