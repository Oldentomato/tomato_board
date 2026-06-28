import { isMockMode } from "@/lib/config/env";
import {
  MOCK_CHAT_GRAPHS,
  MOCK_CHAT_ROOMS,
  createEmptyGraph,
  createNodeId,
  createRoomId,
} from "@/lib/mock/chatStore";
import { ApiError, apiClient, buildApiUrl } from "./client";
import { handleAuthFailure } from "./authRedirect";
import type {
  ChatAgent,
  ChatGraph,
  ChatMessageNode,
  ChatRoom,
} from "@/lib/types/chat";

export type ChatRoomsResponse = {
  rooms: ChatRoom[];
};

export type CreateChatRoomResponse = {
  room: ChatRoom;
  graph: ChatGraph;
};

export type ChatAgentsResponse = {
  agents: ChatAgent[];
};

export type SendChatMessageInput = {
  parentId: string;
  content: string;
  agentId?: string | null;
};

export type SendChatMessageResponse = {
  graph: ChatGraph;
  activeNodeId: string;
};

export type ChatStreamInitEvent = {
  graph: ChatGraph;
  userNodeId: string;
  assistantNodeId: string;
};

export type ChatStreamHandlers = {
  onInit: (data: ChatStreamInitEvent) => void;
  onDelta: (delta: string) => void;
  onThoughtDelta?: (delta: string) => void;
  onToolStart?: (data: { toolName: string; input?: Record<string, unknown> | null; runId?: string | null }) => void;
  onToolEnd?: (data: { toolName: string; output?: string | null; runId?: string | null }) => void;
  onStepStart?: (data: { stepName: string; runId?: string | null }) => void;
  onStepEnd?: (data: { stepName: string; runId?: string | null }) => void;
  onDone: (data: SendChatMessageResponse) => void;
};

type ChatStreamEvent =
  | { type: "init"; data: ChatStreamInitEvent }
  | { type: "delta"; data: { delta: string } }
  | { type: "thought_delta"; data: { delta: string } }
  | { type: "tool_start"; data: { toolName: string; input?: Record<string, unknown> | null; runId?: string | null } }
  | { type: "tool_end"; data: { toolName: string; output?: string | null; runId?: string | null } }
  | { type: "step_start"; data: { stepName: string; runId?: string | null } }
  | { type: "step_end"; data: { stepName: string; runId?: string | null } }
  | { type: "done"; data: SendChatMessageResponse };

function mockAssistantReply(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return "메시지를 입력해 주세요.";
  return `「${trimmed}」에 대한 답변입니다. (서버 연동 전 목 응답)`;
}

let mockRooms = [...MOCK_CHAT_ROOMS];
let mockGraphs: Record<string, ChatGraph> = { ...MOCK_CHAT_GRAPHS };

export function getChatAgents() {
  if (isMockMode()) {
    return Promise.resolve({
      agents: [{ id: "general", label: "일반 대화", description: "자유로운 일반 대화" }],
    });
  }
  return apiClient<ChatAgentsResponse>("/chat/agents");
}

export function getChatRooms() {
  if (isMockMode()) {
    return Promise.resolve({ rooms: [...mockRooms] });
  }
  return apiClient<ChatRoomsResponse>("/chat/rooms");
}

export function getChatGraph(roomId: string) {
  if (isMockMode()) {
    const graph = mockGraphs[roomId];
    if (!graph) return Promise.reject(new Error("Graph not found"));
    return Promise.resolve(graph);
  }
  return apiClient<ChatGraph>(`/chat/rooms/${roomId}/graph`);
}

export function createChatRoom() {
  if (isMockMode()) {
    const roomId = createRoomId();
    const graph = createEmptyGraph(roomId);
    const now = new Date().toISOString();
    const room: ChatRoom = {
      id: roomId,
      title: "새 대화",
      updatedAt: now,
      preview: "새 대화가 시작되었습니다.",
    };
    mockRooms = [room, ...mockRooms];
    mockGraphs = { ...mockGraphs, [roomId]: graph };
    return Promise.resolve({ room, graph });
  }
  return apiClient<CreateChatRoomResponse>("/chat/rooms", { method: "POST" });
}

export function deleteChatRoom(roomId: string) {
  if (isMockMode()) {
    mockRooms = mockRooms.filter((room) => room.id !== roomId);
    const { [roomId]: _, ...rest } = mockGraphs;
    mockGraphs = rest;
    return Promise.resolve();
  }
  return apiClient<void>(`/chat/rooms/${roomId}`, { method: "DELETE" });
}

function mockAssistantReplyChunks(content: string): string[] {
  const reply = mockAssistantReply(content);
  const words = reply.split(" ");
  return words.map((word, index) => (index === 0 ? word : ` ${word}`));
}

async function mockSendChatMessageStream(
  roomId: string,
  input: SendChatMessageInput,
  handlers: ChatStreamHandlers,
) {
  const trimmed = input.content.trim();
  const graph = mockGraphs[roomId];
  if (!graph || !trimmed) throw new Error("Invalid request");

  const parent = graph.nodes[input.parentId];
  if (!parent) throw new Error("Parent not found");

  const userNodeId = createNodeId();
  const assistantNodeId = createNodeId();
  const now = new Date().toISOString();

  const userNode: ChatMessageNode = {
    id: userNodeId,
    role: "user",
    content: trimmed,
    createdAt: now,
    parentId: input.parentId,
    childIds: [assistantNodeId],
  };
  const assistantNode: ChatMessageNode = {
    id: assistantNodeId,
    role: "assistant",
    content: "",
    createdAt: now,
    parentId: userNodeId,
    childIds: [],
  };

  const initGraph: ChatGraph = {
    ...graph,
    nodes: {
      ...graph.nodes,
      [input.parentId]: { ...parent, childIds: [...parent.childIds, userNodeId] },
      [userNodeId]: userNode,
      [assistantNodeId]: assistantNode,
    },
  };
  mockGraphs = { ...mockGraphs, [roomId]: initGraph };
  mockRooms = mockRooms.map((room) =>
    room.id === roomId
      ? {
          ...room,
          updatedAt: now,
          preview: trimmed,
          title: room.title === "새 대화" ? trimmed.slice(0, 24) : room.title,
        }
      : room,
  );

  handlers.onInit({
    graph: initGraph,
    userNodeId,
    assistantNodeId,
  });

  if (/검색|뉴스|날씨|최신|search|news|weather/i.test(trimmed)) {
    handlers.onToolStart?.({ toolName: "tavily_search", input: { query: trimmed }, runId: "mock-tool-1" });
    await new Promise((resolve) => setTimeout(resolve, 120));
    handlers.onToolEnd?.({
      toolName: "tavily_search",
      output: "Mock search results for demonstration.",
      runId: "mock-tool-1",
    });
  }

  const thoughtChunks = [
    "사용자 질문의 핵심을 파악합니다.",
    " 관련 맥락을 정리한 뒤",
    " 답변을 구성합니다.",
  ];
  let fullThought = "";
  for (const chunk of thoughtChunks) {
    fullThought += chunk;
    handlers.onThoughtDelta?.(chunk);
    await new Promise((resolve) => setTimeout(resolve, 40));
  }

  let fullContent = "";
  for (const chunk of mockAssistantReplyChunks(trimmed)) {
    fullContent += chunk;
    handlers.onDelta(chunk);
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  const doneGraph: ChatGraph = {
    ...initGraph,
    nodes: {
      ...initGraph.nodes,
      [assistantNodeId]: {
        ...assistantNode,
        content: fullContent,
        thought: fullThought,
        createdAt: new Date().toISOString(),
      },
    },
  };
  mockGraphs = { ...mockGraphs, [roomId]: doneGraph };
  handlers.onDone({ graph: doneGraph, activeNodeId: assistantNodeId });
}

async function consumeChatStream(response: Response, handlers: ChatStreamHandlers) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Streaming response body is unavailable.");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as ChatStreamEvent;
      if (event.type === "init") handlers.onInit(event.data);
      else if (event.type === "delta") handlers.onDelta(event.data.delta);
      else if (event.type === "thought_delta") handlers.onThoughtDelta?.(event.data.delta);
      else if (event.type === "tool_start") handlers.onToolStart?.(event.data);
      else if (event.type === "tool_end") handlers.onToolEnd?.(event.data);
      else if (event.type === "step_start") handlers.onStepStart?.(event.data);
      else if (event.type === "step_end") handlers.onStepEnd?.(event.data);
      else if (event.type === "done") handlers.onDone(event.data);
    }
  }
}

export function sendChatMessageStream(
  roomId: string,
  input: SendChatMessageInput,
  handlers: ChatStreamHandlers,
) {
  if (isMockMode()) {
    return mockSendChatMessageStream(roomId, input, handlers);
  }

  return (async () => {
    const response = await fetch(buildApiUrl(`/chat/rooms/${roomId}/messages`), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (response.status === 401) {
      const errorText = await response.text().catch(() => "Unauthorized");
      handleAuthFailure(401, errorText);
      throw new ApiError(401, errorText || "Unauthorized");
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Request failed");
      handleAuthFailure(response.status, errorText);
      throw new ApiError(response.status, errorText || response.statusText);
    }

    await consumeChatStream(response, handlers);
  })();
}

export function sendChatMessage(roomId: string, input: SendChatMessageInput) {
  return new Promise<SendChatMessageResponse>((resolve, reject) => {
    void sendChatMessageStream(roomId, input, {
      onInit: () => {},
      onDelta: () => {},
      onDone: resolve,
    }).catch(reject);
  });
}

export function prepareChatMessage(roomId: string, input: SendChatMessageInput) {
  if (isMockMode()) {
    throw new Error("prepareChatMessage is only available with a live backend.");
  }
  return apiClient<ChatStreamInitEvent>(`/chat/rooms/${roomId}/messages/prepare`, {
    method: "POST",
    body: input,
  });
}

export function finalizeChatMessage(
  roomId: string,
  assistantNodeId: string,
  body: { content: string; thought?: string | null },
) {
  if (isMockMode()) {
    return Promise.resolve({ graph: {} as never, activeNodeId: assistantNodeId });
  }
  return apiClient<SendChatMessageResponse>(`/chat/rooms/${roomId}/messages/${assistantNodeId}`, {
    method: "PUT",
    body,
  });
}
