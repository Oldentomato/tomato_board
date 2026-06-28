export type ChatMessageRole = "user" | "assistant" | "system";

/** Neo4j 그래프 노드 — parent/children 관계로 분기 대화를 표현 */
export type ChatMessageNode = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  parentId: string | null;
  childIds: string[];
  thought?: string | null;
};

export type ChatGraph = {
  roomId: string;
  nodes: Record<string, ChatMessageNode>;
  rootId: string;
};

export type ChatRoom = {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
};

export type ChatAgent = {
  id: string;
  label: string;
  description: string;
};

export type ChatBranchContext = {
  roomId: string;
  activeNodeId: string;
  pathNodeIds: string[];
  branchPointId: string | null;
};

export type AgentToolActivity = {
  id: string;
  toolName: string;
  status: "running" | "complete" | "error";
  input?: Record<string, unknown> | null;
  output?: string | null;
};

export type AgentActivityState = {
  phase: "idle" | "running" | "completed" | "error";
  currentStep: string | null;
  tools: AgentToolActivity[];
  error: string | null;
};

export const IDLE_AGENT_ACTIVITY: AgentActivityState = {
  phase: "idle",
  currentStep: null,
  tools: [],
  error: null,
};
