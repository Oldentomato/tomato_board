"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GitBranch, Move } from "lucide-react";
import { TurnFlowNode, type TurnFlowNodeData } from "@/components/chat/TurnFlowNode";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useChatGraphContext } from "@/components/chat/ChatGraphContext";
import { graphToFlowElements } from "@/lib/chat/graphToFlow";
import { cn } from "@/lib/utils/cn";

const nodeTypes = { turn: TurnFlowNode } satisfies NodeTypes;

export function ChatHistoryTree({ className }: { className?: string }) {
  const theme = useSkyTheme();
  const { selectedGraph, activeNodeId, branchContext, selectNode } = useChatGraphContext();
  const flowRef = useRef<ReactFlowInstance<Node<TurnFlowNodeData>, Edge> | null>(null);

  const pathNodeIds = branchContext?.pathNodeIds ?? [];

  const { nodes, edges } = useMemo(() => {
    if (!selectedGraph) return { nodes: [], edges: [] };
    return graphToFlowElements(selectedGraph, activeNodeId, pathNodeIds);
  }, [selectedGraph, activeNodeId, pathNodeIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      flowRef.current?.fitView({ padding: 0.22, duration: 280 });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [selectedGraph?.roomId, nodes.length, edges.length]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<TurnFlowNodeData>) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const handleInit = useCallback((instance: ReactFlowInstance<Node<TurnFlowNodeData>, Edge>) => {
    flowRef.current = instance;
    instance.fitView({ padding: 0.22, duration: 0 });
  }, []);

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-2xl border shadow-sm",
        theme.sidebarBorder,
        "bg-white/40 backdrop-blur-sm",
        className,
      )}
    >
      <div
        className={cn(
          "shrink-0 border-b px-4 py-3",
          theme.sidebarBorder,
          "bg-gradient-to-b from-white/50 to-transparent",
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/5">
            <GitBranch className={cn("h-4 w-4", theme.text)} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={cn("text-sm font-semibold tracking-tight", theme.text)}>대화 트리</h2>
            <p className={cn("flex items-center gap-1 text-[10px] leading-relaxed", theme.faint)}>
              <Move className="h-3 w-3 shrink-0 opacity-70" />
              Turn 클릭으로 분기 · 드래그/스크롤로 탐색
            </p>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {!selectedGraph || nodes.length === 0 ? (
          <p className={cn("p-4 text-sm", theme.muted)}>채팅방을 선택하세요.</p>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={handleInit}
            onNodeClick={handleNodeClick}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnScroll
            zoomOnScroll
            minZoom={0.35}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.04)_1px,transparent_0)] [background-size:18px_18px]"
          >
            <Background gap={18} size={1} color="rgba(0,0,0,0.05)" />
            <Controls showInteractive={false} className="!border-black/10 !bg-white/90 !shadow-sm" />
          </ReactFlow>
        )}
      </div>
    </section>
  );
}
