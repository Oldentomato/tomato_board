import type { Message } from "@ag-ui/core";
import type { ChatGraph, ChatMessageNode } from "@/lib/types/chat";

function getPathToRoot(graph: ChatGraph, nodeId: string): ChatMessageNode[] {
  const path: ChatMessageNode[] = [];
  let current: ChatMessageNode | undefined = graph.nodes[nodeId];
  while (current) {
    path.unshift(current);
    current = current.parentId ? graph.nodes[current.parentId] : undefined;
  }
  return path;
}

/** Neo4j 분기 그래프 → AG-UI Message[] (CopilotKit agent.runAgent 입력) */
export function buildAgUiMessages(graph: ChatGraph, leafNodeId: string): Message[] {
  return getPathToRoot(graph, leafNodeId)
    .filter((node) => node.role === "user" || node.role === "assistant")
    .map((node) => ({
      id: node.id,
      role: node.role,
      content: node.content,
    }));
}
