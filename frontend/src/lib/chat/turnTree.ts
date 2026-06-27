import dagre from "@dagrejs/dagre";
import type { ChatGraph, ChatMessageNode } from "@/lib/types/chat";

export const TURN_NODE_W = 220;
export const TURN_NODE_H = 132;

export type TurnTreeNode = {
  id: string;
  turnIndex: number;
  user: ChatMessageNode;
  assistant: ChatMessageNode | null;
  nodeIds: string[];
  parentId: string | null;
  childIds: string[];
};

function getFirstUserNodeId(graph: ChatGraph): string | null {
  let currentId: string | null = graph.rootId;
  while (currentId) {
    const node: ChatMessageNode | undefined = graph.nodes[currentId];
    if (!node) return null;
    if (node.role === "user") return currentId;
    currentId =
      node.childIds.find((id: string) => {
        const child = graph.nodes[id];
        return child && child.role !== "system";
      }) ?? null;
  }
  return null;
}

function buildTurnSet(graph: ChatGraph, userNodeId: string) {
  const user = graph.nodes[userNodeId];
  if (!user || user.role !== "user") return null;

  const assistantId = user.childIds.find((id) => graph.nodes[id]?.role === "assistant");
  const assistant = assistantId ? (graph.nodes[assistantId] ?? null) : null;

  return {
    id: assistant?.id ?? user.id,
    user,
    assistant,
    nodeIds: assistant ? [user.id, assistant.id] : [user.id],
  };
}

function getChildTurnUserIds(graph: ChatGraph, userNodeId: string, assistant: ChatMessageNode | null) {
  const tail = assistant ?? graph.nodes[userNodeId];
  if (!tail) return [];
  return tail.childIds.filter((id) => graph.nodes[id]?.role === "user");
}

export function buildTurnTree(graph: ChatGraph): TurnTreeNode[] {
  const firstUserId = getFirstUserNodeId(graph);
  if (!firstUserId) return [];

  const turns: TurnTreeNode[] = [];
  let turnCounter = 0;

  function walk(userNodeId: string, parentTurnId: string | null) {
    const turnSet = buildTurnSet(graph, userNodeId);
    if (!turnSet) return;

    turnCounter += 1;
    const childUserIds = getChildTurnUserIds(graph, userNodeId, turnSet.assistant);
    const childIds = childUserIds
      .map((id) => buildTurnSet(graph, id)?.id)
      .filter((id): id is string => !!id);

    turns.push({
      id: turnSet.id,
      turnIndex: turnCounter,
      user: turnSet.user,
      assistant: turnSet.assistant,
      nodeIds: turnSet.nodeIds,
      parentId: parentTurnId,
      childIds,
    });

    for (const childUserId of childUserIds) {
      walk(childUserId, turnSet.id);
    }
  }

  walk(firstUserId, null);
  return turns;
}

export function layoutTurnTree(turns: TurnTreeNode[]): Map<string, { x: number; y: number }> {
  if (turns.length === 0) return new Map();

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "TB",
    nodesep: 56,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
  });

  for (const turn of turns) {
    graph.setNode(turn.id, { width: TURN_NODE_W, height: TURN_NODE_H });
  }

  for (const turn of turns) {
    for (const childId of turn.childIds) {
      graph.setEdge(turn.id, childId);
    }
  }

  dagre.layout(graph);

  const positions = new Map<string, { x: number; y: number }>();
  for (const turn of turns) {
    const node = graph.node(turn.id);
    positions.set(turn.id, {
      x: node.x - TURN_NODE_W / 2,
      y: node.y - TURN_NODE_H / 2,
    });
  }

  return positions;
}

export function turnIsOnPath(turn: TurnTreeNode, pathNodeIds: Set<string>) {
  return turn.nodeIds.some((id) => pathNodeIds.has(id));
}

export function turnIsActive(turn: TurnTreeNode, activeNodeId: string | null) {
  return activeNodeId !== null && turn.nodeIds.includes(activeNodeId);
}
