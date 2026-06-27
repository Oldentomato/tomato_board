"use client";

import { memo } from "react";
import { format, parseISO } from "date-fns";
import { Bot, GitBranch, User } from "lucide-react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import type { TurnTreeNode } from "@/lib/chat/turnTree";
import { cn } from "@/lib/utils/cn";

export type TurnFlowNodeData = {
  turn: TurnTreeNode;
  isActive: boolean;
  isOnPath: boolean;
};

function TurnFlowNodeComponent({ data }: NodeProps<Node<TurnFlowNodeData>>) {
  const theme = useSkyTheme();
  const { turn, isActive, isOnPath } = data;
  const { user, assistant, turnIndex, childIds } = turn;
  const time = assistant?.createdAt ?? user.createdAt;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!h-1 !w-1 !border-0 !bg-transparent" />
      <div
        className={cn(
          "h-full w-full cursor-pointer overflow-hidden rounded-xl border-2 border-slate-300/70 bg-white/95 text-left shadow-sm transition-all",
          isActive && "border-amber-400 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-transparent",
          !isActive && isOnPath && "border-slate-400/80 shadow-md",
          !isActive && !isOnPath && "opacity-85 hover:opacity-100 hover:shadow-md",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-3 py-1.5">
          <span className={cn("text-[10px] font-bold tracking-wide", theme.faint)}>Turn {turnIndex}</span>
          <div className="flex items-center gap-1.5">
            {childIds.length > 1 && (
              <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                <GitBranch className="h-2.5 w-2.5" />
                {childIds.length}
              </span>
            )}
            <span className={cn("text-[9px] tabular-nums", theme.faint)}>
              {format(parseISO(time), "HH:mm")}
            </span>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-sky-50/60 px-3 py-2">
          <div className="mb-1 flex items-center gap-1">
            <User className="h-3 w-3 text-sky-600" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-sky-700">질문</span>
          </div>
          <p className={cn("line-clamp-2 text-[11px] leading-snug", theme.text)}>{user.content}</p>
        </div>

        <div className="bg-violet-50/50 px-3 py-2">
          <div className="mb-1 flex items-center gap-1">
            <Bot className="h-3 w-3 text-violet-600" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-700">답변</span>
          </div>
          {assistant ? (
            <p className={cn("line-clamp-2 text-[11px] leading-snug", theme.text)}>{assistant.content}</p>
          ) : (
            <p className={cn("text-[11px] italic", theme.faint)}>응답 대기 중…</p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-1 !w-1 !border-0 !bg-transparent" />
    </>
  );
}

export const TurnFlowNode = memo(TurnFlowNodeComponent);
