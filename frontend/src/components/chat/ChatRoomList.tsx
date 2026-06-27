"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, MessageSquarePlus, MessagesSquare, PanelRightClose, Trash2 } from "lucide-react";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useChatGraphContext } from "@/components/chat/ChatGraphContext";
import { cn } from "@/lib/utils/cn";

export function ChatRoomList({
  className,
  onClose,
}: {
  className?: string;
  onClose?: () => void;
}) {
  const theme = useSkyTheme();
  const { rooms, selectedRoomId, selectRoom, createRoom, deleteRoom, isLoading, deletingRoomId } =
    useChatGraphContext();

  const handleDeleteRoom = async (roomId: string, title: string) => {
    if (!window.confirm(`"${title}" 채팅방을 삭제할까요?\n대화 내용은 복구할 수 없습니다.`)) {
      return;
    }
    await deleteRoom(roomId);
  };

  return (
    <aside className={cn("flex min-h-0 flex-col", className)}>
      <div
        className={cn(
          "shrink-0 border-b px-4 py-3.5",
          theme.sidebarBorder,
          "bg-gradient-to-b from-white/60 to-transparent",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/5">
              <MessagesSquare className={cn("h-4 w-4", theme.text)} />
            </span>
            <div>
              <h2 className={cn("text-sm font-semibold tracking-tight", theme.text)}>채팅방</h2>
              <p className={cn("text-[10px]", theme.faint)}>{rooms.length}개 대화</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void createRoom()}
              disabled={!!deletingRoomId}
              className={cn(
                "flex items-center gap-1 rounded-lg bg-black/80 px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-black/90 disabled:opacity-50",
              )}
              aria-label="새 채팅방"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              <span>새 방</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "rounded-lg p-2 transition hover:bg-black/5",
                  theme.muted,
                )}
                aria-label="채팅방 목록 닫기"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3 scrollbar-subtle">
        {isLoading && rooms.length === 0 && (
          <li className={cn("px-2 py-6 text-center text-xs", theme.faint)}>불러오는 중…</li>
        )}
        {!isLoading && rooms.length === 0 && (
          <li className={cn("px-2 py-6 text-center text-xs leading-relaxed", theme.faint)}>
            아직 채팅방이 없습니다.
            <br />
            새 방을 만들어 대화를 시작하세요.
          </li>
        )}
        {rooms.map((room) => {
          const selected = room.id === selectedRoomId;
          return (
            <li key={room.id}>
              <div
                className={cn(
                  "group relative flex items-stretch overflow-hidden rounded-xl transition-all",
                  selected
                    ? "bg-black/[0.07] shadow-sm ring-1 ring-black/10"
                    : "hover:bg-black/[0.04]",
                )}
              >
                {selected && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-black/50" />
                )}
                <button
                  type="button"
                  onClick={() => selectRoom(room.id)}
                  className="min-w-0 flex-1 px-3 py-3 text-left"
                >
                  <p className={cn("truncate text-sm font-medium", theme.text)}>{room.title}</p>
                  <p className={cn("mt-1 line-clamp-2 text-xs leading-relaxed", theme.faint)}>
                    {room.preview}
                  </p>
                  <p className={cn("mt-2 text-[10px] tabular-nums", theme.faint)}>
                    {format(parseISO(room.updatedAt), "M월 d일 HH:mm", { locale: ko })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteRoom(room.id, room.title)}
                  disabled={!!deletingRoomId}
                  className={cn(
                    "flex w-9 shrink-0 items-center justify-center self-center rounded-lg text-red-500/70 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40",
                    selected && "opacity-100",
                  )}
                  aria-label={`${room.title} 삭제`}
                >
                  {deletingRoomId === room.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
