"use client";

import { useState } from "react";
import type { CalendarEvent, CreateEventInput } from "@/lib/types/calendar";
import { cn } from "@/lib/utils/cn";

type EventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateEventInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialDate?: string;
  event?: CalendarEvent;
  isSaving?: boolean;
  isDeleting?: boolean;
};

const inputClass =
  "mt-1.5 w-full rounded-xl bg-white/60 px-3 py-2.5 text-sm text-slate-800 outline-none backdrop-blur-md placeholder:text-slate-400 focus:bg-white/80 focus:ring-2 focus:ring-[#E74C3C]/30";

function toLocalDatetimeValue(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function defaultEnd(start: string) {
  const date = new Date(start);
  date.setHours(date.getHours() + 1);
  return date.toISOString();
}

export function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate,
  event,
  isSaving,
  isDeleting,
}: EventModalProps) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [start, setStart] = useState(
    event ? toLocalDatetimeValue(event.start) : initialDate ?? "",
  );
  const [end, setEnd] = useState(
    event ? toLocalDatetimeValue(event.end) : "",
  );
  const [description, setDescription] = useState(event?.description ?? "");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (!start) {
      setError("시작 시간을 입력해 주세요.");
      return;
    }

    const startIso = new Date(start).toISOString();
    const endIso = end ? new Date(end).toISOString() : defaultEnd(startIso);

    try {
      await onSave({
        title: title.trim(),
        start: startIso,
        end: endIso,
        description: description.trim() || undefined,
      });
      onClose();
    } catch {
      setError("저장에 실패했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="닫기"
      />
      <div className="relative w-full max-w-md rounded-3xl bg-white/75 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl">
        <h3 className="text-lg font-semibold text-slate-800">
          {event ? "일정 수정" : "일정 추가"}
        </h3>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="event-title" className="block text-sm font-medium text-slate-600">
              제목
            </label>
            <input
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="일정 제목"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-start" className="block text-sm font-medium text-slate-600">
                시작
              </label>
              <input
                id="event-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="event-end" className="block text-sm font-medium text-slate-600">
                종료
              </label>
              <input
                id="event-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-desc" className="block text-sm font-medium text-slate-600">
              설명 (선택)
            </label>
            <textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="메모"
            />
          </div>

          {error && <p className="text-sm text-[#E74C3C]">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            {event && onDelete ? (
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
    </div>
  );
}
