"use client";

import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Bot, MessagesSquare, Send, User } from "lucide-react";
import { useAgentContext } from "@copilotkit/react-core/v2";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useChatGraphContext } from "@/components/chat/ChatGraphContext";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import { ChatAgentStatusPanel } from "@/components/chat/ChatAgentStatusPanel";
import { AgentToolRenderers } from "@/components/chat/AgentToolRenderers";
import { cn } from "@/lib/utils/cn";

/**
 * CopilotKit agent context에 분기 정보를 주입.
 * AG-UI 에이전트 연동 시 동일 컨텍스트로 Neo4j 분기 상태를 전달할 수 있습니다.
 */
function BranchContextSync() {
  const { branchContext, activePath } = useChatGraphContext();

  useAgentContext({
    description: "Neo4j 기반 채팅 분기 컨텍스트 (roomId, activeNodeId, path)",
    value: branchContext
      ? {
          chatBranch: branchContext,
          activeMessages: activePath.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }
      : { chatBranch: null, activeMessages: [] },
  });

  return null;
}

export function ChatWindow({
  className,
  roomsOpen,
  onToggleRooms,
  onCloseRooms,
}: {
  className?: string;
  roomsOpen?: boolean;
  onToggleRooms?: () => void;
  onCloseRooms?: () => void;
}) {
  const theme = useSkyTheme();
  const { activePath, branchContext, sendMessage, selectedRoomId, isSending, streamingNodeId, agents, selectedAgentId, setSelectedAgentId, agentActivity } =
    useChatGraphContext();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activePath, streamingNodeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setInput("");
    try {
      await sendMessage(trimmed);
    } catch {
      setInput(trimmed);
    }
  };

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm",
        theme.sidebarBorder,
        "bg-white/40 backdrop-blur-sm",
        className,
      )}
      onClick={() => {
        if (roomsOpen) onCloseRooms?.();
      }}
    >
      <BranchContextSync />
      <AgentToolRenderers />

      <header
        className={cn(
          "sticky top-0 z-10 shrink-0 border-b px-4 py-3",
          theme.sidebarBorder,
          "bg-white/80 backdrop-blur-md",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className={cn("text-sm font-semibold tracking-tight", theme.text)}>AI 채팅</h2>
            {branchContext ? (
              <p className={cn("mt-0.5 text-[11px]", theme.faint)}>
                {branchContext.pathNodeIds.length}개 분기 · {selectedRoomId?.slice(0, 8)}…
              </p>
            ) : (
              <p className={cn("mt-0.5 text-[11px]", theme.faint)}>대화를 시작해 보세요</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {agents.length > 0 && (
              <select
                value={selectedAgentId ?? ""}
                onChange={(e) => setSelectedAgentId(e.target.value || null)}
                disabled={isSending}
                className={cn(
                  "max-w-[140px] rounded-xl border bg-white/70 px-2.5 py-2 text-xs shadow-sm outline-none transition focus:border-black/15 focus:ring-2 focus:ring-black/5",
                  theme.sidebarBorder,
                  theme.text,
                )}
                aria-label="에이전트 선택"
              >
                <option value="">일반 대화</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.label}
                  </option>
                ))}
              </select>
            )}
            {onToggleRooms && (
            <button
              type="button"
              onClick={onToggleRooms}
              aria-expanded={roomsOpen}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200",
                roomsOpen
                  ? "bg-black/85 text-white shadow-sm"
                  : cn("border bg-white/60 hover:bg-white/80", theme.sidebarBorder, theme.muted),
              )}
              aria-label={roomsOpen ? "채팅방 목록 닫기" : "채팅방 목록 열기"}
            >
              <MessagesSquare className="h-3.5 w-3.5" />
              <span>채팅방</span>
            </button>
            )}
          </div>
        </div>
        <div className="mt-2.5">
          <ChatAgentStatusPanel activity={agentActivity} />
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-subtle">
        {activePath.length === 0 ? (
          <div className={cn("flex h-full flex-col items-center justify-center px-6 text-center", theme.muted)}>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/5">
              <Bot className="h-7 w-7 opacity-50" />
            </div>
            <p className="text-sm font-medium">대화를 시작하세요</p>
            <p className={cn("mt-1.5 max-w-xs text-xs leading-relaxed", theme.faint)}>
              왼쪽 트리에서 Turn을 선택하면 해당 지점에서 분기할 수 있습니다.
            </p>
          </div>
        ) : (
          activePath.map((message) => {
            const isUser = message.role === "user";
            const isStreaming = streamingNodeId === message.id;
            return (
              <div
                key={message.id}
                className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-black/5",
                    isUser ? "bg-sky-100/80" : "bg-violet-100/80",
                  )}
                >
                  {isUser ? (
                    <User className="h-3.5 w-3.5 text-sky-700" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-violet-700" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm",
                    isUser
                      ? "rounded-tr-md bg-sky-500/10 ring-1 ring-sky-500/10"
                      : "rounded-tl-md bg-white/70 ring-1 ring-black/5",
                  )}
                >
                  {isUser ? (
                    <p className={cn("text-sm leading-relaxed whitespace-pre-wrap", theme.text)}>
                      {message.content}
                    </p>
                  ) : (
                    <div className={theme.text}>
                      <ChatMarkdown content={message.content} />
                      {isStreaming && (
                        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-violet-500 align-middle" />
                      )}
                    </div>
                  )}
                  <p className={cn("mt-1.5 text-[10px] tabular-nums", theme.faint)}>
                    {format(parseISO(message.createdAt), "M월 d일 HH:mm", { locale: ko })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className={cn(
          "sticky bottom-0 z-10 shrink-0 border-t px-4 py-3",
          theme.sidebarBorder,
          "bg-white/80 backdrop-blur-md",
        )}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit(e);
              }
            }}
            placeholder="메시지 입력…"
            rows={2}
            className={cn(
              "min-h-[44px] flex-1 resize-none rounded-xl border bg-white/70 px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-black/15 focus:ring-2 focus:ring-black/5",
              theme.sidebarBorder,
              theme.text,
            )}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition",
              "bg-black/85 text-white hover:bg-black/95 disabled:opacity-35",
            )}
            aria-label="전송"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
