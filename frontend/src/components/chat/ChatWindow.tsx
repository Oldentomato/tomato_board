"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Bot, CircleHelp, FileText, MessagesSquare, Send, User } from "lucide-react";
import { useAgentContext } from "@copilotkit/react-core/v2";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useChatGraphContext } from "@/components/chat/ChatGraphContext";
import { useDocuments } from "@/hooks/useDocuments";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import { ChatAgentStatusPanel } from "@/components/chat/ChatAgentStatusPanel";
import { ChatGuideModal } from "@/components/chat/ChatGuideModal";
import { DocumentPreviewPanel } from "@/components/chat/DocumentPreviewPanel";
import { cn } from "@/lib/utils/cn";

/**
 * CopilotKit agent context에 분기 정보를 주입.
 * AG-UI 에이전트 연동 시 동일 컨텍스트로 Neo4j 분기 상태를 전달할 수 있습니다.
 */
function BranchContextSync() {
  const { branchContext, activePath, selectedAgentId } = useChatGraphContext();
  const { documents } = useDocuments();

  useAgentContext({
    description: "Neo4j 기반 채팅 분기 컨텍스트 및 문서 패널 동기화",
    value: branchContext
      ? {
          chatBranch: branchContext,
          activeMessages: activePath.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          ...(selectedAgentId === "document"
            ? {
                uploadedDocuments: documents.map((doc) => ({
                  id: doc.id,
                  title: doc.title,
                  sourceFormat: doc.sourceFormat,
                  status: doc.status,
                })),
              }
            : {}),
        }
      : {
          chatBranch: null,
          activeMessages: [],
          ...(selectedAgentId === "document"
            ? {
                uploadedDocuments: documents.map((doc) => ({
                  id: doc.id,
                  title: doc.title,
                  sourceFormat: doc.sourceFormat,
                  status: doc.status,
                })),
              }
            : {}),
        },
  });

  return null;
}

export function ChatWindow({
  className,
  roomsOpen,
  onToggleRooms,
  onCloseRooms,
  documentsOpen,
  onToggleDocuments,
  onCloseDocuments,
}: {
  className?: string;
  roomsOpen?: boolean;
  onToggleRooms?: () => void;
  onCloseRooms?: () => void;
  documentsOpen?: boolean;
  onToggleDocuments?: () => void;
  onCloseDocuments?: () => void;
}) {
  const theme = useSkyTheme();
  const { activePath, branchContext, sendMessage, selectedRoomId, isSending, streamingNodeId, agents, selectedAgentId, setSelectedAgentId, agentActivity, documentPreviewsByMessageId } =
    useChatGraphContext();
  const [input, setInput] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

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

  const ghostHover = theme.isDark ? "hover:bg-white/10" : "hover:bg-black/5";
  const ghostButton = cn(
    "flex shrink-0 items-center gap-1.5 rounded-full border bg-transparent px-3 py-1.5 text-xs font-medium transition",
    theme.sidebarBorder,
    ghostHover,
    theme.muted,
  );

  return (
    <section
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
      onClick={() => {
        if (roomsOpen) onCloseRooms?.();
        if (documentsOpen) onCloseDocuments?.();
      }}
    >
      <BranchContextSync />
      <ChatGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        selectedAgentId={selectedAgentId}
      />

      <header className="shrink-0 px-1 pb-3 pt-1 sm:px-2">
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
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {agents.length > 0 && (
              <select
                value={selectedAgentId ?? ""}
                onChange={(e) => setSelectedAgentId(e.target.value || null)}
                disabled={isSending}
                className={cn(
                  "max-w-[140px] rounded-full border bg-transparent px-2.5 py-1.5 text-xs outline-none transition",
                  theme.sidebarBorder,
                  ghostHover,
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setGuideOpen(true);
              }}
              className={cn(ghostButton, "px-2")}
              aria-label="AI 채팅 가이드 열기"
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
            {onToggleDocuments && (
              <button
                type="button"
                onClick={onToggleDocuments}
                aria-expanded={documentsOpen}
                className={cn(
                  ghostButton,
                  documentsOpen && "bg-[#E74C3C] text-white hover:bg-[#c0392b]",
                )}
                aria-label={documentsOpen ? "문서 목록 닫기" : "문서 목록 열기"}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>문서</span>
              </button>
            )}
            {onToggleRooms && (
              <button
                type="button"
                onClick={onToggleRooms}
                aria-expanded={roomsOpen}
                className={cn(
                  ghostButton,
                  roomsOpen && "bg-black/80 text-white hover:bg-black/90",
                )}
                aria-label={roomsOpen ? "채팅방 목록 닫기" : "채팅방 목록 열기"}
              >
                <MessagesSquare className="h-3.5 w-3.5" />
                <span>채팅방</span>
              </button>
            )}
          </div>
        </div>
        <div className="mt-3">
          <ChatAgentStatusPanel activity={agentActivity} />
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-1 py-2 scrollbar-subtle sm:px-2">
        {activePath.length === 0 ? (
          <div className={cn("flex h-full flex-col items-center justify-center px-6 text-center", theme.muted)}>
            <Bot className={cn("mb-5 h-10 w-10 opacity-40", theme.icon)} />
            <p className={cn("text-base font-medium", theme.text)}>대화를 시작하세요</p>
            <p className={cn("mt-2 max-w-sm text-sm leading-relaxed", theme.faint)}>
              메시지를 입력하면 새 채팅방이 자동으로 만들어집니다.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 py-4">
            {activePath.map((message) => {
              const isUser = message.role === "user";
              const isStreaming = streamingNodeId === message.id;
              const messagePreviews = documentPreviewsByMessageId[message.id] ?? [];
              return (
                <div
                  key={message.id}
                  className={cn("flex items-start gap-3", isUser ? "flex-row-reverse" : "flex-row")}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      isUser ? "bg-[#E74C3C] text-white" : "bg-violet-100 text-violet-700",
                    )}
                  >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn("min-w-0", isUser ? "max-w-[78%]" : "flex-1")}>
                    {isUser ? (
                      <p className="rounded-3xl rounded-tr-lg bg-[#E74C3C] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white">
                        {message.content}
                      </p>
                    ) : (
                      <div className="rounded-3xl rounded-tl-lg bg-white/75 px-4 py-3 text-[0.95rem] leading-7 text-slate-900 backdrop-blur-sm">
                        <ChatMarkdown content={message.content} className="text-[0.95rem] leading-7" />
                        {messagePreviews.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {messagePreviews.map((preview, index) => (
                              <DocumentPreviewPanel
                                key={`${preview.document_id}-${index}`}
                                payload={preview}
                              />
                            ))}
                          </div>
                        )}
                        {isStreaming && (
                          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-middle opacity-60" />
                        )}
                      </div>
                    )}
                    <p
                      className={cn(
                        "mt-2 text-[10px] tabular-nums",
                        isUser && "text-right",
                        theme.faint,
                      )}
                    >
                      {format(parseISO(message.createdAt), "M월 d일 HH:mm", { locale: ko })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 px-1 pb-1 pt-3 sm:px-2 sm:pb-2">
        <div
          className={cn(
            "mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border bg-white/70 px-3 py-2 backdrop-blur-md",
            theme.sidebarBorder,
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit(e);
              }
            }}
            placeholder="메시지 입력…"
            rows={1}
            className={cn(
              "min-h-[44px] flex-1 resize-none overflow-hidden bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none",
              theme.text,
            )}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className={cn(
              "mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition",
              "bg-[#E74C3C] text-white hover:bg-[#c0392b] disabled:opacity-35",
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
