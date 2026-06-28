"use client";

import { useState } from "react";
import { EnterAnimation } from "@/components/dashboard/EnterAnimation";
import { ChatGraphProvider } from "@/components/chat/ChatGraphContext";
import { ChatHistoryTree } from "@/components/chat/ChatHistoryTree";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { cn } from "@/lib/utils/cn";

function ChatRoomDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const theme = useSkyTheme();

  return (
    <aside
      className={cn(
        "shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
        open ? "w-72" : "w-0",
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "flex h-full w-72 flex-col border-l shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.12)] transition-[transform,opacity] duration-300 ease-in-out",
          theme.sidebarBorder,
          "bg-white/80 backdrop-blur-xl",
          open ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
        )}
      >
        <ChatRoomList className="min-h-0 flex-1 rounded-none border-0 bg-transparent" onClose={onClose} />
      </div>
    </aside>
  );
}

export default function ChatPage() {
  const theme = useSkyTheme();
  const [roomsOpen, setRoomsOpen] = useState(false);

  const toggleRooms = () => setRoomsOpen((prev) => !prev);

  return (
    <ChatGraphProvider>
      <EnterAnimation variant="up" delay={80} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden lg:grid-cols-[minmax(260px,38%)_1fr] lg:grid-rows-1 lg:gap-4">
          <ChatHistoryTree className="h-full min-h-0" />

          <div
            className={cn(
              "flex h-full min-h-0 min-w-0 overflow-hidden rounded-2xl border shadow-sm",
              theme.sidebarBorder,
              "bg-white/40 backdrop-blur-sm",
            )}
          >
            <ChatWindow
              className="min-h-0 min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none"
              roomsOpen={roomsOpen}
              onToggleRooms={toggleRooms}
              onCloseRooms={() => setRoomsOpen(false)}
            />
            <ChatRoomDrawer open={roomsOpen} onClose={() => setRoomsOpen(false)} />
          </div>
        </div>
      </EnterAnimation>
    </ChatGraphProvider>
  );
}
