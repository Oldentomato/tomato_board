"use client";

import { createPortal } from "react-dom";
import { Bot, FileText, Lightbulb, X } from "lucide-react";
import { CHAT_GUIDE } from "@/lib/chat/guideContent";
import { cn } from "@/lib/utils/cn";

type ChatGuideModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedAgentId?: string | null;
};

export function ChatGuideModal({ isOpen, onClose, selectedAgentId }: ChatGuideModalProps) {
  if (!isOpen || typeof document === "undefined") return null;

  const activeAgentId = selectedAgentId ?? "general";
  const tip =
    activeAgentId === "document" ? CHAT_GUIDE.tips.document : CHAT_GUIDE.tips.general;

  const agentSections =
    activeAgentId === "document"
      ? [...CHAT_GUIDE.agents].sort((a, b) => (a.id === "document" ? -1 : b.id === "document" ? 1 : 0))
      : CHAT_GUIDE.agents;

  const showDocumentsFirst = activeAgentId === "document";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="닫기"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-guide-title"
        className="relative flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-900/15 bg-transparent"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/5 px-6 py-5">
          <div className="min-w-0">
            <h3 id="chat-guide-title" className="text-lg font-semibold text-slate-800">
              {CHAT_GUIDE.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{CHAT_GUIDE.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-black/5 hover:text-slate-700"
            aria-label="가이드 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 scrollbar-subtle">
          <div className="flex gap-2.5 rounded-2xl border border-amber-400/50 bg-transparent px-3.5 py-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm leading-relaxed text-amber-900/90">{tip}</p>
          </div>

          {showDocumentsFirst ? (
            <>
              <DocumentGuideSection />
              <AgentGuideSection agents={agentSections} activeAgentId={activeAgentId} />
            </>
          ) : (
            <>
              <AgentGuideSection agents={agentSections} activeAgentId={activeAgentId} />
              <DocumentGuideSection />
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-black/5 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="ml-auto block rounded-full bg-[#E74C3C] px-5 py-2 text-sm font-medium text-white shadow-lg shadow-[#E74C3C]/25 transition hover:bg-[#c0392b]"
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AgentGuideSection({
  agents,
  activeAgentId,
}: {
  agents: typeof CHAT_GUIDE.agents;
  activeAgentId: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Bot className="h-4 w-4 text-violet-600" />
        <h4 className="text-sm font-semibold text-slate-800">에이전트</h4>
      </div>
      <div className="space-y-3">
        {agents.map((agent) => {
          const isActive = agent.id === activeAgentId;
          return (
            <div
              key={agent.id}
              className={cn(
                "rounded-2xl border bg-transparent px-3.5 py-3",
                isActive ? "border-violet-400/60" : "border-slate-900/12",
              )}
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-800">{agent.title}</p>
                {isActive && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                    선택됨
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{agent.body}</p>
              <ul className="mt-2 space-y-1">
                {agent.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2 text-xs leading-relaxed text-slate-500">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DocumentGuideSection() {
  const { documents } = CHAT_GUIDE;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-[#E74C3C]" />
        <h4 className="text-sm font-semibold text-slate-800">{documents.title}</h4>
      </div>
      <div className="rounded-2xl border border-slate-900/12 bg-transparent px-3.5 py-3">
        <p className="text-xs leading-relaxed text-slate-600">{documents.body}</p>
        <ul className="mt-2 space-y-1">
          {documents.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2 text-xs leading-relaxed text-slate-500">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
