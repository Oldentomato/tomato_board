import type { Edge, Node } from "@xyflow/react";
import type { ChatGraph } from "@/lib/types/chat";
import {
  TURN_NODE_H,
  TURN_NODE_W,
  buildTurnTree,
  layoutTurnTree,
  turnIsActive,
  turnIsOnPath,
} from "@/lib/chat/turnTree";
import type { TurnFlowNodeData } from "@/components/chat/TurnFlowNode";

const ACTIVE_EDGE = "rgb(251 191 36 / 0.95)";
const DEFAULT_EDGE = "rgb(148 163 184 / 0.55)";

export function graphToFlowElements(
  graph: ChatGraph,
  activeNodeId: string | null,
  pathNodeIds: string[],
): { nodes: Node<TurnFlowNodeData>[]; edges: Edge[] } {
  const turns = buildTurnTree(graph);
  const positions = layoutTurnTree(turns);
  const pathSet = new Set(pathNodeIds);
  const turnById = new Map(turns.map((turn) => [turn.id, turn]));

  const nodes: Node<TurnFlowNodeData>[] = turns.map((turn) => ({
    id: turn.id,
    type: "turn",
    position: positions.get(turn.id) ?? { x: 0, y: 0 },
    data: {
      turn,
      isActive: turnIsActive(turn, activeNodeId),
      isOnPath: turnIsOnPath(turn, pathSet),
    },
    draggable: false,
    selectable: false,
    width: TURN_NODE_W,
    height: TURN_NODE_H,
  }));

  const edges: Edge[] = [];
  for (const turn of turns) {
    for (const childId of turn.childIds) {
      const child = turnById.get(childId);
      const edgeOnPath = child && turnIsOnPath(turn, pathSet) && turnIsOnPath(child, pathSet);

      edges.push({
        id: `${turn.id}->${childId}`,
        source: turn.id,
        target: childId,
        type: "smoothstep",
        style: {
          stroke: edgeOnPath ? ACTIVE_EDGE : DEFAULT_EDGE,
          strokeWidth: edgeOnPath ? 2.5 : 2,
        },
      });
    }
  }

  return { nodes, edges };
}
