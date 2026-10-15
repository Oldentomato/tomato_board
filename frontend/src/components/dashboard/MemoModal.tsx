"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Archive, ArchiveRestore, Pencil, X } from "lucide-react";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import type { Memo } from "@/lib/types/memo";
import { DEFAULT_MEMO_COLOR, MEMO_COLORS } from "@/lib/types/memo";
import { parseUtcIso } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/cn";

type MemoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: { content: string; color: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onToggleArchive?: () => Promise<void>;
  memo?: Memo;
  isSaving?: boolean;
  isDeleting?: boolean;
  isTogglingArchive?: boolean;
};

const inputClass =
  "mt-1.5 w-full rounded-xl bg-white/60 px-3 py-2.5 text-sm text-slate-800 outline-none backdrop-blur-md placeholder:text-slate-400 focus:bg-white/80 focus:ring-2 focus:ring-[#E74C3C]/30";

function MemoEditForm({
  content,
  color,
  error,
  isCreate,
  isSaving,
  isDeleting,
  showDelete,
  onContentChange,
  onColorChange,
  onCancel,
  onSubmit,
  onDeleteClick,
}: {
  content: string;
  color: string;
  error: string;
  isCreate: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  showDelete: boolean;
  onContentChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDeleteClick?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col">
      <h3 className="text-lg font-semibold text-slate-800">
        {isCreate ? "새 메모" : "메모 수정"}
      </h3>

      <div className="mt-5 flex min-h-0 flex-1 flex-col space-y-4">
        <div className="flex min-h-0 flex-1 flex-col">
          <label htmlFor="memo-content" className="block text-sm font-medium text-slate-600">
            내용
          </label>
          <textarea
            id="memo-content"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={isCreate ? 8 : undefined}
            className={cn(inputClass, !isCreate && "min-h-[12rem] flex-1 resize-none")}
            placeholder="메모를 입력하세요 (마크다운 지원)"
            autoFocus
          />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-600">색상</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MEMO_COLORS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onColorChange(item.value)}
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition",
                  color === item.value
                    ? "scale-110 border-[#E74C3C]"
                    : "border-white/80 hover:scale-105",
                )}
                style={{ backgroundColor: item.value }}
                aria-label={item.label}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-[#E74C3C]">{error}</p>}
      </div>

      <div className="mt-4 flex items-center justify-between pt-2">
        {showDelete && onDeleteClick ? (
          <button
            type="button"
            onClick={onDeleteClick}
            disabled={isDeleting}
            className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
          >
            삭제
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/60"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-[#E74C3C] px-5 py-2 text-sm font-medium text-white shadow-lg shadow-[#E74C3C]/25 transition hover:bg-[#c0392b] disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </form>
  );
}

function DeleteConfirmDialog({
  isDeleting,
  onCancel,
  onConfirm,
}: {
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        className="memo-modal-backdrop absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
        disabled={isDeleting}
        aria-label="닫기"
      />
      <div
        role="alertdialog"
        aria-labelledby="memo-delete-title"
        aria-describedby="memo-delete-desc"
        className="memo-modal-create relative w-full max-w-sm rounded-3xl bg-white/90 p-6 shadow-2xl shadow-slate-900/15 backdrop-blur-2xl"
      >
        <h3 id="memo-delete-title" className="text-lg font-semibold text-slate-800">
          메모 삭제
        </h3>
        <p id="memo-delete-desc" className="mt-2 text-sm leading-relaxed text-slate-600">
          이 메모를 삭제할까요? 삭제하면 되돌릴 수 없습니다.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-black/5 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-full bg-red-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/25 transition hover:bg-red-600 disabled:opacity-50"
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MemoModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onToggleArchive,
  memo,
  isSaving,
  isDeleting,
  isTogglingArchive,
}: MemoModalProps) {
  const isCreate = !memo;
  const [content, setContent] = useState(memo?.content ?? "");
  const [color, setColor] = useState(memo?.color ?? DEFAULT_MEMO_COLOR);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(isCreate);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setContent(memo?.content ?? "");
    setColor(memo?.color ?? DEFAULT_MEMO_COLOR);
    setError("");
    setIsEditing(!memo);
    setConfirmDelete(false);
  }, [isOpen, memo?.id, memo?.content, memo?.color]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("내용을 입력해 주세요.");
      return;
    }

    try {
      await onSave({ content: content.trim(), color });
      onClose();
    } catch {
      setError("저장에 실패했습니다.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    try {
      await onDelete();
      setConfirmDelete(false);
      onClose();
    } catch {
      setError("삭제에 실패했습니다.");
      setConfirmDelete(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!onToggleArchive) return;
    try {
      await onToggleArchive();
      onClose();
    } catch {
      setError("이동에 실패했습니다.");
    }
  };

  const previewContent = content.trim() ? content : "_내용이 없습니다._";

  if (isCreate) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <button
          type="button"
          className="memo-modal-backdrop absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
          onClick={onClose}
          aria-label="닫기"
        />
        <div className="memo-modal-create relative w-full max-w-md rounded-3xl bg-white/75 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl">
          <MemoEditForm
            content={content}
            color={color}
            error={error}
            isCreate
            isSaving={isSaving}
            isDeleting={isDeleting}
            showDelete={false}
            onContentChange={setContent}
            onColorChange={setColor}
            onCancel={onClose}
            onSubmit={handleSubmit}
          />
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="memo-modal-backdrop absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="닫기"
      />

      <div
        className={cn(
          "memo-modal-pop relative flex max-h-[min(92vh,48rem)] w-full flex-col items-stretch justify-center transition-[max-width,gap] duration-300 ease-out sm:flex-row",
          isEditing ? "max-w-4xl gap-4" : "max-w-xl gap-0",
        )}
      >
        <div
          className={cn(
            "relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl shadow-2xl shadow-slate-900/15 transition-all duration-300 ease-out",
            isEditing
              ? "h-[min(42vh,20rem)] w-full sm:h-auto sm:w-[min(100%,28rem)] sm:shrink-0 sm:-translate-x-1"
              : "w-full max-w-xl translate-x-0",
          )}
          style={{ backgroundColor: color }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-black/5 px-5 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600/70">메모</p>
              {memo.updatedAt && (
                <time className="mt-0.5 block text-xs text-slate-600/70">
                  {format(parseUtcIso(memo.updatedAt), "yyyy.M.d HH:mm", { locale: ko })}
                </time>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1">
              {onToggleArchive && (
                <button
                  type="button"
                  onClick={() => void handleToggleArchive()}
                  disabled={isTogglingArchive}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-white/80 disabled:opacity-50"
                >
                  {memo.archived ? (
                    <>
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      기본으로 이동
                    </>
                  ) : (
                    <>
                      <Archive className="h-3.5 w-3.5" />
                      아카이브로 이동
                    </>
                  )}
                </button>
              )}
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-white/80"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  수정
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-600 transition hover:bg-white/50"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <ChatMarkdown
              content={previewContent}
              className="text-[0.95rem] leading-relaxed text-slate-800"
            />
            {error && !isEditing && <p className="mt-3 text-sm text-[#E74C3C]">{error}</p>}
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 overflow-hidden transition-all duration-300 ease-out",
            isEditing
              ? "max-h-[min(50vh,28rem)] w-full max-w-md translate-y-0 opacity-100 sm:max-h-none sm:translate-x-0 sm:translate-y-0"
              : "pointer-events-none max-h-0 w-full max-w-md translate-y-4 opacity-0 sm:w-0 sm:max-w-0 sm:translate-x-6 sm:translate-y-0",
          )}
          aria-hidden={!isEditing}
        >
          <div className="h-full w-full max-w-md rounded-3xl bg-white/75 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl">
            {isEditing && (
              <MemoEditForm
                content={content}
                color={color}
                error={error}
                isCreate={false}
                isSaving={isSaving}
                isDeleting={isDeleting}
                showDelete={Boolean(onDelete)}
                onContentChange={setContent}
                onColorChange={setColor}
                onCancel={() => {
                  setContent(memo.content);
                  setColor(memo.color);
                  setError("");
                  setIsEditing(false);
                }}
                onSubmit={handleSubmit}
                onDeleteClick={() => setConfirmDelete(true)}
              />
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <DeleteConfirmDialog
          isDeleting={isDeleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>,
    document.body,
  );
}
