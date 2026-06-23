"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { parseUtcIso } from "@/lib/utils/datetime";
import { Plus, StickyNote } from "lucide-react";
import { EnterAnimation } from "@/components/dashboard/EnterAnimation";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useMemos } from "@/hooks/useMemos";
import type { Memo, MemoSide } from "@/lib/types/memo";
import { DEFAULT_MEMO_COLOR, groupMemosBySide } from "@/lib/types/memo";
import { cn } from "@/lib/utils/cn";
import { MemoModal } from "./MemoModal";

const ROTATIONS = [-2.5, 1.8, -1.2, 2.2, -1.8, 1.4];
const MEMO_DRAG_TYPE = "application/x-tomato-memo-id";

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
        event.dataTransfer.setData(MEMO_DRAG_TYPE, memo.id);
        event.dataTransfer.effectAllowed = "move";
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
      <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
        {memo.content}
      </p>
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
  onAdd,
  onEdit,
  onDragStartMemo,
  onDragEndMemo,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  side: MemoSide;
  memos: Memo[];
  isLoading?: boolean;
  isDragOver?: boolean;
  draggingMemoId?: string | null;
  showHeader?: boolean;
  onAdd: () => void;
  onEdit: (memo: Memo) => void;
  onDragStartMemo: (memoId: string) => void;
  onDragEndMemo: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
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
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center gap-0.5 text-[11px] font-medium transition-opacity hover:opacity-70"
            >
              <Plus className="h-3 w-3" />
              추가
            </button>
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
  onAdd,
  onEdit,
}: {
  memos: Memo[];
  isLoading: boolean;
  isError: boolean;
  onAdd: () => void;
  onEdit: (memo: Memo) => void;
}) {
  const theme = useSkyTheme();

  return (
    <section className={cn("rounded-2xl border px-4 py-4 lg:hidden", theme.sidebarBorder)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className={cn("h-4 w-4", theme.text)} />
          <h2 className={cn("text-sm font-semibold", theme.text)}>메모</h2>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            "flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70",
            theme.muted,
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          추가
        </button>
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
                onEdit={onEdit}
                onDragStartMemo={() => {}}
                onDragEndMemo={() => {}}
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
  const [draggingMemoId, setDraggingMemoId] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<MemoSide | null>(null);

  const { left, right } = groupMemosBySide(memos);

  const openCreateModal = () => {
    setEditingMemo(null);
    setIsModalOpen(true);
  };

  const openEditModal = (memo: Memo) => {
    setEditingMemo(memo);
    setIsModalOpen(true);
  };

  const endDrag = () => {
    setDraggingMemoId(null);
    setDragOverSide(null);
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
    setDragOverSide(null);
    endDrag();

    const memoId = event.dataTransfer.getData(MEMO_DRAG_TYPE);
    if (!memoId) return;

    const dropIndex = resolveDropIndex(event, sideMemos);
    const memo = memos.find((item) => item.id === memoId);
    if (!memo) return;

    let index = dropIndex;
    if (memo.side === side && memo.sortOrder < dropIndex) {
      index = dropIndex - 1;
    }
    if (memo.side === side && memo.sortOrder === index) return;

    await moveMemo({ id: memoId, input: { side, index } });
  };

  const railHandlers = (side: MemoSide, sideMemos: Memo[]) => ({
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      setDragOverSide(side);
    },
    onDragLeave: (event: React.DragEvent) => {
      const related = event.relatedTarget as Node | null;
      if (related && event.currentTarget.contains(related)) return;
      setDragOverSide((current) => (current === side ? null : current));
    },
    onDrop: (event: React.DragEvent) => handleDrop(event, side, sideMemos),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <MobileMemoStrip
        memos={memos}
        isLoading={isLoading}
        isError={isError}
        onAdd={openCreateModal}
        onEdit={openEditModal}
      />

      <div className="grid gap-5 lg:grid-cols-[12rem_1fr_12rem] lg:min-h-0 lg:flex-1 lg:items-stretch lg:gap-5 xl:grid-cols-[14rem_1fr_14rem]">
        <EnterAnimation variant="unfold" delay={120} className="h-full">
          <MemoRail
            side="left"
            memos={left}
            isLoading={isLoading}
            isDragOver={dragOverSide === "left"}
            draggingMemoId={draggingMemoId}
            showHeader
            onAdd={openCreateModal}
            onEdit={openEditModal}
            onDragStartMemo={setDraggingMemoId}
            onDragEndMemo={endDrag}
            {...railHandlers("left", left)}
          />
        </EnterAnimation>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>

        <EnterAnimation variant="unfold" delay={180} className="h-full">
          <MemoRail
            side="right"
            memos={right}
            isLoading={isLoading}
            isDragOver={dragOverSide === "right"}
            draggingMemoId={draggingMemoId}
            onAdd={openCreateModal}
            onEdit={openEditModal}
            onDragStartMemo={setDraggingMemoId}
            onDragEndMemo={endDrag}
            {...railHandlers("right", right)}
          />
        </EnterAnimation>
      </div>

      <MemoModal
        key={editingMemo?.id ?? "new"}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMemo(null);
        }}
        memo={editingMemo ?? undefined}
        isSaving={isCreating || isUpdating}
        isDeleting={isDeleting}
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
      />
    </div>
  );
}
