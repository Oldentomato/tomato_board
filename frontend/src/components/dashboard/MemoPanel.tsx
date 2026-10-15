"use client";

import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { parseUtcIso } from "@/lib/utils/datetime";
import { Archive, Plus, Search, StickyNote } from "lucide-react";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import { EnterAnimation } from "@/components/dashboard/EnterAnimation";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useMemos } from "@/hooks/useMemos";
import type { Memo, MemoSide } from "@/lib/types/memo";
import { DEFAULT_MEMO_COLOR, getArchivedMemos, groupMemosBySide } from "@/lib/types/memo";
import { cn } from "@/lib/utils/cn";
import { MemoModal } from "./MemoModal";

const ROTATIONS = [-2.5, 1.8, -1.2, 2.2, -1.8, 1.4];
const MEMO_DRAG_TYPE = "application/x-tomato-memo-id";

type DragOverTarget = MemoSide | "archive" | "mobile" | null;

function getDraggedMemoId(event: React.DragEvent) {
  return event.dataTransfer.getData(MEMO_DRAG_TYPE) || event.dataTransfer.getData("text/plain");
}

function startMemoDrag(event: React.DragEvent, memoId: string) {
  event.dataTransfer.setData(MEMO_DRAG_TYPE, memoId);
  event.dataTransfer.setData("text/plain", memoId);
  event.dataTransfer.effectAllowed = "move";
}

type ArchiveViewMode = "latest" | "month";

function memoMatchesKeywords(content: string, query: string) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = content.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function groupArchivedMemosByMonth(memos: Memo[]) {
  const groups = new Map<string, { key: string; label: string; memos: Memo[] }>();
  for (const memo of memos) {
    const date = parseUtcIso(memo.updatedAt);
    const key = format(date, "yyyy-MM");
    const existing = groups.get(key);
    if (existing) {
      existing.memos.push(memo);
      continue;
    }
    groups.set(key, {
      key,
      label: format(date, "yyyy년 M월", { locale: ko }),
      memos: [memo],
    });
  }
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

function MemoHeaderActions({
  isArchiveView,
  isDragOver,
  onToggleArchive,
  onAdd,
  onDragOver,
  onDragLeave,
  onDrop,
  compact,
}: {
  isArchiveView: boolean;
  isDragOver?: boolean;
  onToggleArchive: () => void;
  onAdd: () => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragLeave?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
      <button
        type="button"
        draggable={false}
        onClick={onToggleArchive}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        aria-pressed={isArchiveView}
        className={cn(
          "flex items-center gap-0.5 rounded-md px-1 py-0.5 font-medium transition hover:opacity-70",
          compact ? "text-[11px]" : "text-xs",
          isArchiveView ? "text-[#E74C3C]" : "",
          isDragOver && "bg-[#E74C3C]/15 text-[#E74C3C] ring-2 ring-[#E74C3C]/30",
        )}
      >
        <Archive className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        아카이브
      </button>
      <button
        type="button"
        onClick={onAdd}
        className={cn(
          "flex items-center gap-0.5 font-medium transition-opacity hover:opacity-70",
          compact ? "text-[11px]" : "text-xs",
        )}
      >
        <Plus className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        추가
      </button>
    </div>
  );
}

function ArchiveMemoCard({
  memo,
  index,
  isDragging,
  onEdit,
  onDragStartMemo,
  onDragEndMemo,
}: {
  memo: Memo;
  index: number;
  isDragging?: boolean;
  onEdit: (memo: Memo) => void;
  onDragStartMemo: (memoId: string) => void;
  onDragEndMemo: () => void;
}) {
  const wasDragged = useRef(false);

  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      onDragStart={(event) => {
        wasDragged.current = true;
        onDragStartMemo(memo.id);
        startMemoDrag(event, memo.id);
      }}
      onDragEnd={() => {
        onDragEndMemo();
        window.setTimeout(() => {
          wasDragged.current = false;
        }, 0);
      }}
      onClick={() => {
        if (wasDragged.current) return;
        onEdit(memo);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(memo);
        }
      }}
      className={cn(
        "enter-item min-h-[9rem] cursor-grab rounded-xl p-3 text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E74C3C]/40 active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      style={{
        backgroundColor: memo.color,
        animationDelay: `${80 + index * 40}ms`,
      }}
    >
      <div className="max-h-[7.5rem] overflow-hidden text-sm leading-relaxed text-slate-800 [&_*]:!mb-1 [&_*]:!mt-0 [&_pre]:overflow-hidden">
        <ChatMarkdown content={memo.content} className="text-sm" />
      </div>
      <time className="mt-2 block text-xs text-slate-600/70">
        {format(parseUtcIso(memo.updatedAt), "M/d HH:mm", { locale: ko })}
      </time>
    </div>
  );
}

function MemoArchiveBoard({
  memos,
  isLoading,
  isDragOver,
  draggingMemoId,
  onEdit,
  onDragStartMemo,
  onDragEndMemo,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  memos: Memo[];
  isLoading: boolean;
  isDragOver?: boolean;
  draggingMemoId?: string | null;
  onEdit: (memo: Memo) => void;
  onDragStartMemo: (memoId: string) => void;
  onDragEndMemo: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}) {
  const theme = useSkyTheme();
  const [keywordInput, setKeywordInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [viewMode, setViewMode] = useState<ArchiveViewMode>("latest");
  const isFiltering = appliedQuery.length > 0;
  const visibleMemos = isFiltering
    ? memos.filter((memo) => memoMatchesKeywords(memo.content, appliedQuery))
    : memos;
  const monthGroups = useMemo(
    () => (viewMode === "month" ? groupArchivedMemosByMonth(visibleMemos) : []),
    [viewMode, visibleMemos],
  );

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setAppliedQuery(keywordInput.trim());
  };

  const handleReset = () => {
    setKeywordInput("");
    setAppliedQuery("");
  };

  const renderMemoGrid = (items: Memo[], keyPrefix = "") => (
    <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((memo, index) => (
        <ArchiveMemoCard
          key={`${keyPrefix}${memo.id}`}
          memo={memo}
          index={index}
          isDragging={draggingMemoId === memo.id}
          onEdit={onEdit}
          onDragStartMemo={onDragStartMemo}
          onDragEndMemo={onDragEndMemo}
        />
      ))}
    </div>
  );

  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex min-h-[24rem] flex-1 flex-col rounded-2xl p-1 transition-colors",
        isDragOver && "bg-white/10 ring-2 ring-[#E74C3C]/25 ring-inset",
      )}
    >
      <div className="mb-3 flex flex-col gap-2 px-1">
        <div className="flex items-center gap-2">
          <Archive className={cn("h-4 w-4", theme.text)} />
          <h2 className={cn("text-sm font-semibold", theme.text)}>아카이브</h2>
          {!isLoading && (
            <span className={cn("text-xs", theme.muted)}>
              {isFiltering ? `${visibleMemos.length}/${memos.length}` : memos.length}
            </span>
          )}
          <div
            className={cn("ml-auto flex rounded-md border p-0.5", theme.sidebarBorder)}
            role="group"
            aria-label="아카이브 보기"
          >
            <button
              type="button"
              onClick={() => setViewMode("latest")}
              aria-pressed={viewMode === "latest"}
              className={cn(
                "rounded px-2 py-1 text-[11px] font-medium transition",
                viewMode === "latest"
                  ? "bg-[#E74C3C] text-white"
                  : cn("hover:opacity-80", theme.muted),
              )}
            >
              최신순
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              aria-pressed={viewMode === "month"}
              className={cn(
                "rounded px-2 py-1 text-[11px] font-medium transition",
                viewMode === "month"
                  ? "bg-[#E74C3C] text-white"
                  : cn("hover:opacity-80", theme.muted),
              )}
            >
              달별
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-1.5">
          <label className="sr-only" htmlFor="archive-memo-search">
            아카이브 검색
          </label>
          <input
            id="archive-memo-search"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="키워드 검색"
            className={cn(
              "min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1.5 text-xs outline-none transition-colors focus:border-[#E74C3C]/60",
              theme.sidebarBorder,
              theme.text,
            )}
          />
          <button
            type="submit"
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-opacity hover:opacity-80",
              theme.muted,
            )}
          >
            <Search className="h-3 w-3" />
            검색
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!isFiltering && keywordInput.length === 0}
            className={cn(
              "shrink-0 rounded-md px-2 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40",
              theme.muted,
            )}
          >
            초기화
          </button>
        </form>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn("h-32 animate-pulse rounded-xl opacity-20", theme.text, "bg-current")}
            />
          ))}
        </div>
      )}

      {!isLoading && memos.length === 0 && (
        <div
          className={cn(
            "flex flex-1 items-center justify-center rounded-2xl border border-dashed py-16 text-sm",
            theme.sidebarBorder,
            isDragOver ? theme.text : theme.muted,
          )}
        >
          {isDragOver ? "여기에 놓으면 아카이브됩니다." : "아카이브된 메모가 없습니다."}
        </div>
      )}

      {!isLoading && memos.length > 0 && visibleMemos.length === 0 && (
        <div
          className={cn(
            "flex flex-1 items-center justify-center rounded-2xl border border-dashed py-16 text-sm",
            theme.sidebarBorder,
            theme.muted,
          )}
        >
          검색 결과가 없습니다.
        </div>
      )}

      {!isLoading && visibleMemos.length > 0 && viewMode === "latest" && (
        <div className="flex-1">{renderMemoGrid(visibleMemos)}</div>
      )}

      {!isLoading && visibleMemos.length > 0 && viewMode === "month" && (
        <div className="flex flex-1 flex-col gap-5">
          {monthGroups.map((group) => (
            <section key={group.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 px-1">
                <h3 className={cn("text-xs font-semibold", theme.text)}>{group.label}</h3>
                <span className={cn("text-xs font-medium", theme.muted)}>{group.memos.length}</span>
              </div>
              {renderMemoGrid(group.memos, `${group.key}-`)}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function getRotation(index: number, side: MemoSide) {
  const base = ROTATIONS[index % ROTATIONS.length];
  return side === "left" ? base : -base;
}

function MemoCard({
  memo,
  index,
  side,
  isDragging,
  onEdit,
  onDragStartMemo,
  onDragEndMemo,
}: {
  memo: Memo;
  index: number;
  side: MemoSide;
  isDragging?: boolean;
  onEdit: (memo: Memo) => void;
  onDragStartMemo: (memoId: string) => void;
  onDragEndMemo: () => void;
}) {
  const wasDragged = useRef(false);
  const rotation = getRotation(index, side);

  return (
    <div
      draggable
      onDragStart={(event) => {
        wasDragged.current = true;
        onDragStartMemo(memo.id);
        startMemoDrag(event, memo.id);
      }}
      onDragEnd={() => {
        onDragEndMemo();
        window.setTimeout(() => {
          wasDragged.current = false;
        }, 0);
      }}
      onClick={() => {
        if (wasDragged.current) return;
        onEdit(memo);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(memo);
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "w-full cursor-grab rounded-sm p-3 text-left shadow-md transition active:cursor-grabbing",
        "hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E74C3C]/40",
        isDragging && "opacity-40",
      )}
      style={{
        backgroundColor: memo.color,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <div className="max-h-[10.5rem] overflow-hidden text-sm leading-relaxed text-slate-800 [&_*]:!mb-1 [&_*]:!mt-0 [&_pre]:overflow-hidden">
        <ChatMarkdown content={memo.content} className="text-sm" />
      </div>
      <time className="mt-2 block text-xs text-slate-600/70">
        {format(parseUtcIso(memo.updatedAt), "M/d HH:mm", { locale: ko })}
      </time>
    </div>
  );
}

function MemoRail({
  side,
  memos,
  isLoading,
  isDragOver,
  draggingMemoId,
  showHeader,
  isArchiveView,
  isArchiveDragOver,
  onAdd,
  onToggleArchive,
  onEdit,
  onDragStartMemo,
  onDragEndMemo,
  onDragOver,
  onDragLeave,
  onDrop,
  onArchiveDragOver,
  onArchiveDragLeave,
  onArchiveDrop,
}: {
  side: MemoSide;
  memos: Memo[];
  isLoading?: boolean;
  isDragOver?: boolean;
  draggingMemoId?: string | null;
  showHeader?: boolean;
  isArchiveView?: boolean;
  isArchiveDragOver?: boolean;
  onAdd: () => void;
  onToggleArchive: () => void;
  onEdit: (memo: Memo) => void;
  onDragStartMemo: (memoId: string) => void;
  onDragEndMemo: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onArchiveDragOver: (event: React.DragEvent) => void;
  onArchiveDragLeave: (event: React.DragEvent) => void;
  onArchiveDrop: (event: React.DragEvent) => void;
}) {
  const theme = useSkyTheme();

  return (
    <aside
      data-memo-side={side}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "hidden w-full self-stretch lg:flex",
        side === "left" ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "flex min-h-full w-full flex-col rounded-xl px-1 py-2 transition-colors",
          isDragOver && "bg-white/10 ring-2 ring-[#E74C3C]/25 ring-inset",
        )}
      >
        {showHeader && (
          <div className={cn("mb-2 flex w-full shrink-0 items-center justify-between px-1", theme.muted)}>
            <div className="flex items-center gap-1.5">
              <StickyNote className={cn("h-4 w-4", theme.text)} />
              <span className={cn("text-xs font-semibold", theme.text)}>메모</span>
            </div>
            <MemoHeaderActions
              compact
              isArchiveView={Boolean(isArchiveView)}
              isDragOver={isArchiveDragOver}
              onToggleArchive={onToggleArchive}
              onAdd={onAdd}
              onDragOver={onArchiveDragOver}
              onDragLeave={onArchiveDragLeave}
              onDrop={onArchiveDrop}
            />
          </div>
        )}

        <div className="flex min-h-[16rem] flex-1 flex-col">
          {isLoading &&
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "my-2 h-24 w-full animate-pulse rounded-sm opacity-20",
                  theme.text,
                  "bg-current",
                )}
              />
            ))}

          {!isLoading && memos.length === 0 && showHeader && (
            <button
              type="button"
              onClick={onAdd}
              className={cn(
                "my-2 flex h-28 w-full items-center justify-center rounded-sm border border-dashed text-[11px] transition hover:opacity-80",
                theme.sidebarBorder,
                theme.faint,
              )}
            >
              포스트잇 붙이기
            </button>
          )}

          {!isLoading &&
            memos.map((memo, index) => (
              <div
                key={memo.id}
                data-drop-slot={index}
                className="enter-item w-full py-3"
                style={{ animationDelay: `${360 + index * 55}ms` }}
              >
                <MemoCard
                  memo={memo}
                  index={index}
                  side={side}
                  isDragging={draggingMemoId === memo.id}
                  onEdit={onEdit}
                  onDragStartMemo={onDragStartMemo}
                  onDragEndMemo={onDragEndMemo}
                />
              </div>
            ))}

          {!isLoading && (
            <div
              data-drop-slot="end"
              className={cn(
                "mt-1 min-h-[8rem] w-full flex-1 rounded-lg",
                isDragOver && memos.length > 0 && "bg-white/5",
              )}
              aria-hidden
            />
          )}
        </div>
      </div>
    </aside>
  );
}

function MobileMemoStrip({
  memos,
  isLoading,
  isError,
  isArchiveView,
  isArchiveDragOver,
  isDragOver,
  draggingMemoId,
  onAdd,
  onToggleArchive,
  onEdit,
  onDragStartMemo,
  onDragEndMemo,
  onDragOver,
  onDragLeave,
  onDrop,
  onArchiveDragOver,
  onArchiveDragLeave,
  onArchiveDrop,
}: {
  memos: Memo[];
  isLoading: boolean;
  isError: boolean;
  isArchiveView: boolean;
  isArchiveDragOver?: boolean;
  isDragOver?: boolean;
  draggingMemoId?: string | null;
  onAdd: () => void;
  onToggleArchive: () => void;
  onEdit: (memo: Memo) => void;
  onDragStartMemo: (memoId: string) => void;
  onDragEndMemo: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onArchiveDragOver: (event: React.DragEvent) => void;
  onArchiveDragLeave: (event: React.DragEvent) => void;
  onArchiveDrop: (event: React.DragEvent) => void;
}) {
  const theme = useSkyTheme();

  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl border px-4 py-4 lg:hidden",
        theme.sidebarBorder,
        isDragOver && "bg-white/10 ring-2 ring-[#E74C3C]/25 ring-inset",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className={cn("h-4 w-4", theme.text)} />
          <h2 className={cn("text-sm font-semibold", theme.text)}>메모</h2>
        </div>
        <div className={theme.muted}>
          <MemoHeaderActions
            isArchiveView={isArchiveView}
            isDragOver={isArchiveDragOver}
            onToggleArchive={onToggleArchive}
            onAdd={onAdd}
            onDragOver={onArchiveDragOver}
            onDragLeave={onArchiveDragLeave}
            onDrop={onArchiveDrop}
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn("h-24 w-28 shrink-0 animate-pulse rounded-sm opacity-20", theme.text, "bg-current")}
            />
          ))}
        </div>
      )}

      {isError && <p className={cn("text-sm", theme.muted)}>메모를 불러올 수 없습니다.</p>}

      {!isLoading && !isError && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {memos.map((memo, index) => (
            <div key={memo.id} className="w-28 shrink-0">
              <MemoCard
                memo={memo}
                index={index}
                side={memo.side}
                isDragging={draggingMemoId === memo.id}
                onEdit={onEdit}
                onDragStartMemo={onDragStartMemo}
                onDragEndMemo={onDragEndMemo}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              "flex h-24 w-28 shrink-0 items-center justify-center rounded-sm border border-dashed text-[11px]",
              theme.sidebarBorder,
              theme.faint,
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}

export function MemoBoard({ children }: { children: React.ReactNode }) {
  const {
    memos,
    isLoading,
    isError,
    createMemo,
    updateMemo,
    deleteMemo,
    moveMemo,
    isCreating,
    isUpdating,
    isDeleting,
  } = useMemos();

  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArchiveView, setIsArchiveView] = useState(false);
  const [draggingMemoId, setDraggingMemoId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<DragOverTarget>(null);
  const draggingMemoRef = useRef<Memo | null>(null);

  const { left, right } = groupMemosBySide(memos);
  const archivedMemos = getArchivedMemos(memos);
  const toggleArchiveView = () => setIsArchiveView((current) => !current);

  const openCreateModal = () => {
    setEditingMemo(null);
    setIsModalOpen(true);
  };

  const openEditModal = (memo: Memo) => {
    setEditingMemo(memo);
    setIsModalOpen(true);
  };

  const beginDrag = (memoId: string) => {
    draggingMemoRef.current = memos.find((item) => item.id === memoId) ?? null;
    setDraggingMemoId(memoId);
  };

  const endDrag = () => {
    draggingMemoRef.current = null;
    setDraggingMemoId(null);
    setDragOverTarget(null);
  };

  const resolveDropIndex = (event: React.DragEvent, sideMemos: Memo[]) => {
    const rail = (event.currentTarget as HTMLElement).closest("[data-memo-side]");
    if (!rail) return sideMemos.length;

    const slots = rail.querySelectorAll("[data-drop-slot]:not([data-drop-slot='end'])");
    const y = event.clientY;

    for (let i = 0; i < slots.length; i++) {
      const rect = slots[i].getBoundingClientRect();
      if (y < rect.top + rect.height / 2) {
        return i;
      }
    }

    return sideMemos.length;
  };

  const handleDrop = async (event: React.DragEvent, side: MemoSide, sideMemos: Memo[]) => {
    event.preventDefault();
    endDrag();

    const memoId = getDraggedMemoId(event);
    if (!memoId) return;

    const dropIndex = resolveDropIndex(event, sideMemos);
    const memo = memos.find((item) => item.id === memoId);
    if (!memo) return;

    if (memo.archived) {
      await moveMemo({ id: memoId, input: { side, index: dropIndex } });
      return;
    }

    let index = dropIndex;
    if (memo.side === side && memo.sortOrder < dropIndex) {
      index = dropIndex - 1;
    }
    if (memo.side === side && memo.sortOrder === index) return;

    await moveMemo({ id: memoId, input: { side, index } });
  };

  const handleArchiveDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    endDrag();

    const memoId = getDraggedMemoId(event);
    if (!memoId) return;

    const memo = memos.find((item) => item.id === memoId);
    if (!memo || memo.archived) return;

    await updateMemo({ id: memoId, input: { archived: true } });
  };

  const handleMobileDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    endDrag();

    const memoId = getDraggedMemoId(event);
    if (!memoId) return;

    const memo = memos.find((item) => item.id === memoId);
    if (!memo?.archived) return;

    await moveMemo({ id: memoId, input: { side: memo.side, index: 0 } });
  };

  const leaveTarget = (target: DragOverTarget, event: React.DragEvent) => {
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    setDragOverTarget((current) => (current === target ? null : current));
  };

  const archiveDragHandlers = {
    onArchiveDragOver: (event: React.DragEvent) => {
      event.stopPropagation();
      if (draggingMemoRef.current?.archived) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverTarget("archive");
    },
    onArchiveDragLeave: (event: React.DragEvent) => {
      event.stopPropagation();
      leaveTarget("archive", event);
    },
    onArchiveDrop: (event: React.DragEvent) => {
      void handleArchiveDrop(event);
    },
  };

  const railHandlers = (side: MemoSide, sideMemos: Memo[]) => ({
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      setDragOverTarget(side);
    },
    onDragLeave: (event: React.DragEvent) => leaveTarget(side, event),
    onDrop: (event: React.DragEvent) => handleDrop(event, side, sideMemos),
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <MobileMemoStrip
        memos={left.concat(right)}
        isLoading={isLoading}
        isError={isError}
        isArchiveView={isArchiveView}
        isArchiveDragOver={dragOverTarget === "archive"}
        isDragOver={dragOverTarget === "mobile"}
        draggingMemoId={draggingMemoId}
        onAdd={openCreateModal}
        onToggleArchive={toggleArchiveView}
        onEdit={openEditModal}
        onDragStartMemo={beginDrag}
        onDragEndMemo={endDrag}
        onDragOver={(event) => {
          if (!draggingMemoRef.current?.archived) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDragOverTarget("mobile");
        }}
        onDragLeave={(event) => leaveTarget("mobile", event)}
        onDrop={(event) => void handleMobileDrop(event)}
        {...archiveDragHandlers}
      />

      <div className="grid gap-5 lg:grid-cols-[12rem_1fr_12rem] lg:items-stretch lg:gap-5 xl:grid-cols-[14rem_1fr_14rem]">
        <EnterAnimation variant="unfold" delay={120} className="h-full">
          <MemoRail
            side="left"
            memos={left}
            isLoading={isLoading}
            isDragOver={dragOverTarget === "left"}
            draggingMemoId={draggingMemoId}
            showHeader
            isArchiveView={isArchiveView}
            isArchiveDragOver={dragOverTarget === "archive"}
            onAdd={openCreateModal}
            onToggleArchive={toggleArchiveView}
            onEdit={openEditModal}
            onDragStartMemo={beginDrag}
            onDragEndMemo={endDrag}
            {...railHandlers("left", left)}
            {...archiveDragHandlers}
          />
        </EnterAnimation>

        <div className="flex min-w-0 flex-1 flex-col">
          {isArchiveView ? (
            <MemoArchiveBoard
              memos={archivedMemos}
              isLoading={isLoading}
              isDragOver={dragOverTarget === "archive"}
              draggingMemoId={draggingMemoId}
              onEdit={openEditModal}
              onDragStartMemo={beginDrag}
              onDragEndMemo={endDrag}
              onDragOver={archiveDragHandlers.onArchiveDragOver}
              onDragLeave={archiveDragHandlers.onArchiveDragLeave}
              onDrop={archiveDragHandlers.onArchiveDrop}
            />
          ) : (
            children
          )}
        </div>

        <EnterAnimation variant="unfold" delay={180} className="h-full">
          <MemoRail
            side="right"
            memos={right}
            isLoading={isLoading}
            isDragOver={dragOverTarget === "right"}
            draggingMemoId={draggingMemoId}
            isArchiveDragOver={dragOverTarget === "archive"}
            onAdd={openCreateModal}
            onToggleArchive={toggleArchiveView}
            onEdit={openEditModal}
            onDragStartMemo={beginDrag}
            onDragEndMemo={endDrag}
            {...railHandlers("right", right)}
            {...archiveDragHandlers}
          />
        </EnterAnimation>
      </div>

      <MemoModal
        key={`${editingMemo?.id ?? "new"}-${isModalOpen ? "open" : "closed"}`}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMemo(null);
        }}
        memo={editingMemo ?? undefined}
        isSaving={isCreating || isUpdating}
        isDeleting={isDeleting}
        isTogglingArchive={isUpdating}
        onSave={async (input) => {
          if (editingMemo) {
            await updateMemo({ id: editingMemo.id, input });
          } else {
            await createMemo({
              content: input.content,
              color: input.color || DEFAULT_MEMO_COLOR,
              side: "left",
            });
          }
        }}
        onDelete={
          editingMemo
            ? async () => {
                await deleteMemo(editingMemo.id);
              }
            : undefined
        }
        onToggleArchive={
          editingMemo
            ? async () => {
                await updateMemo({
                  id: editingMemo.id,
                  input: { archived: !editingMemo.archived },
                });
              }
            : undefined
        }
      />
    </div>
  );
}
