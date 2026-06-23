"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Memo } from "@/lib/types/memo";
import { DEFAULT_MEMO_COLOR, MEMO_COLORS } from "@/lib/types/memo";
import { cn } from "@/lib/utils/cn";

type MemoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: { content: string; color: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  memo?: Memo;
  isSaving?: boolean;
  isDeleting?: boolean;
};

const inputClass =
  "mt-1.5 w-full rounded-xl bg-white/60 px-3 py-2.5 text-sm text-slate-800 outline-none backdrop-blur-md placeholder:text-slate-400 focus:bg-white/80 focus:ring-2 focus:ring-[#E74C3C]/30";

export function MemoModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  memo,
  isSaving,
  isDeleting,
}: MemoModalProps) {
  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState(memo?.content ?? "");
  const [color, setColor] = useState(memo?.color ?? DEFAULT_MEMO_COLOR);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setContent(memo?.content ?? "");
    setColor(memo?.color ?? DEFAULT_MEMO_COLOR);
    setError("");
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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="닫기"
      />
      <div className="relative w-full max-w-md rounded-3xl bg-white/75 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl">
        <h3 className="text-lg font-semibold text-slate-800">
          {memo ? "메모 수정" : "새 메모"}
        </h3>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="memo-content" className="block text-sm font-medium text-slate-600">
              내용
            </label>
            <textarea
              id="memo-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className={inputClass}
              placeholder="메모를 입력하세요"
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
                  onClick={() => setColor(item.value)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition",
                    color === item.value
                      ? "border-[#E74C3C] scale-110"
                      : "border-white/80 hover:scale-105",
                  )}
                  style={{ backgroundColor: item.value }}
                  aria-label={item.label}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-[#E74C3C]">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            {memo && onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  await onDelete();
                  onClose();
                }}
                disabled={isDeleting}
                className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/60"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={cn(
                  "rounded-full bg-[#E74C3C] px-5 py-2 text-sm font-medium text-white shadow-lg shadow-[#E74C3C]/25 transition hover:bg-[#c0392b] disabled:opacity-50",
                )}
              >
                {isSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
