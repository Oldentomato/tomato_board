"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Sparkles,
  Wrench,
  XCircle,
} from "lucide-react";
import { useAgent, useAgentContext } from "@copilotkit/react-core/v2";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import type { AgentActivityState, AgentToolActivity } from "@/lib/types/chat";
import { IDLE_AGENT_ACTIVITY } from "@/lib/types/chat";
import { cn } from "@/lib/utils/cn";

export { IDLE_AGENT_ACTIVITY as IDLE_ACTIVITY };

function formatToolName(name: string) {
  return name.replace(/_/g, " ");
}

function ToolRow({ tool }: { tool: AgentToolActivity }) {
  const theme = useSkyTheme();
  const running = tool.status === "running";
  const hasDetails =
    (tool.input && Object.keys(tool.input).length > 0) || Boolean(tool.output?.trim());
  const [open, setOpen] = useState(running);

  useEffect(() => {
    if (running) {
      setOpen(true);
    }
  }, [running]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border text-xs",
        running ? "border-amber-200/80 bg-amber-50/70" : "border-emerald-200/70 bg-emerald-50/60",
      )}
    >
      <button
        type="button"
        onClick={() => hasDetails && setOpen((prev) => !prev)}
        disabled={!hasDetails}
        className={cn(
          "flex w-full items-center gap-2 px-2.5 py-2 text-left transition",
          hasDetails && "hover:bg-black/[0.03]",
        )}
        aria-expanded={open}
      >
        {running ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-600" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        )}
        <Wrench className="h-3 w-3 shrink-0 opacity-60" />
        <span className={cn("font-medium capitalize", theme.text)}>{formatToolName(tool.toolName)}</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            running ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700",
          )}
        >
          {running ? "실행 중" : "완료"}
        </span>
        {hasDetails && (
          <ChevronDown
            className={cn(
              "ml-auto h-3.5 w-3.5 shrink-0 opacity-50 transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>
      {open && hasDetails && (
        <div className={cn("border-t px-2.5 py-2", running ? "border-amber-200/60" : "border-emerald-200/60")}>
          {tool.input && Object.keys(tool.input).length > 0 && (
            <div>
              <p className={cn("mb-1 text-[10px] font-medium", theme.faint)}>입력</p>
              <pre className={cn("overflow-x-auto whitespace-pre-wrap break-all text-[10px]", theme.faint)}>
                {JSON.stringify(tool.input, null, 2)}
              </pre>
            </div>
          )}
          {tool.output && !running && (
            <div className={tool.input && Object.keys(tool.input).length > 0 ? "mt-2" : undefined}>
              <p className={cn("mb-1 text-[10px] font-medium", theme.faint)}>결과</p>
              <p className={cn("whitespace-pre-wrap break-words text-[10px]", theme.faint)}>{tool.output}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatAgentStatusPanel({
  activity,
  className,
}: {
  activity: AgentActivityState;
  className?: string;
}) {
  const theme = useSkyTheme();
  const { agent } = useAgent({ agentId: "general" });

  const mergedActivity = useMemo<AgentActivityState>(() => {
    if (activity.phase !== "idle") return activity;
    if (agent.isRunning) {
      return { ...activity, phase: "running" };
    }
    return activity;
  }, [activity, agent.isRunning]);

  useAgentContext({
    description: "에이전트 실행 상태 (단계, 도구 호출, AG-UI 연결)",
    value: {
      aguiConnected: true,
      agentId: "general",
      isRunning: agent.isRunning || mergedActivity.phase === "running",
      phase: mergedActivity.phase,
      currentStep: mergedActivity.currentStep,
      toolCount: mergedActivity.tools.length,
      activeTools: mergedActivity.tools.map((tool) => ({
        name: tool.toolName,
        status: tool.status,
      })),
    },
  });

  useEffect(() => {
    const subscription = agent.subscribe({
      onRunStartedEvent() {
        // useChatGraph에서 activity state를 주로 관리
      },
      onRunErrorEvent({ event }) {
        console.error("Agent run error:", event.message);
      },
    });
    return () => subscription.unsubscribe();
  }, [agent]);

  const showPanel =
    mergedActivity.phase !== "idle" ||
    agent.isRunning ||
    mergedActivity.tools.length > 0;

  const [toolsOpen, setToolsOpen] = useState(true);

  useEffect(() => {
    if (mergedActivity.tools.some((tool) => tool.status === "running")) {
      setToolsOpen(true);
    }
  }, [mergedActivity.tools]);

  if (!showPanel) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px]",
          theme.sidebarBorder,
          "bg-white/50",
          className,
        )}
      >
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        <span className={theme.faint}>AG-UI 에이전트 대기 중</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border px-3 py-2.5",
        theme.sidebarBorder,
        "bg-white/60 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {mergedActivity.phase === "error" ? (
          <XCircle className="h-4 w-4 text-red-500" />
        ) : mergedActivity.phase === "running" || agent.isRunning ? (
          <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
        ) : (
          <Activity className="h-4 w-4 text-violet-600" />
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-semibold", theme.text)}>
            {mergedActivity.phase === "running" || agent.isRunning
              ? "에이전트 실행 중"
              : mergedActivity.phase === "error"
                ? "에이전트 오류"
                : "에이전트 완료"}
          </p>
          {mergedActivity.currentStep && (
            <p className={cn("truncate text-[10px]", theme.faint)}>
              단계: {mergedActivity.currentStep}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
            agent.isRunning || mergedActivity.phase === "running"
              ? "bg-violet-100 text-violet-700"
              : "bg-black/5 text-black/60",
          )}
        >
          AG-UI
        </span>
      </div>

      {mergedActivity.tools.length > 0 && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setToolsOpen((prev) => !prev)}
            className={cn(
              "flex w-full items-center gap-1.5 text-left text-[10px] font-medium uppercase tracking-wide transition hover:opacity-80",
              theme.faint,
            )}
            aria-expanded={toolsOpen}
          >
            <span>도구 사용 ({mergedActivity.tools.length})</span>
            <ChevronDown
              className={cn("h-3 w-3 shrink-0 transition-transform", toolsOpen && "rotate-180")}
            />
          </button>
          {toolsOpen &&
            mergedActivity.tools.map((tool) => (
              <ToolRow key={tool.id} tool={tool} />
            ))}
        </div>
      )}

      {mergedActivity.error && (
        <p className="text-[11px] text-red-600">{mergedActivity.error}</p>
      )}
    </div>
  );
}
