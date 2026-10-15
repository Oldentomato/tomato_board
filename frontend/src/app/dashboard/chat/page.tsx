"use client";

import { useState } from "react";
import { EnterAnimation } from "@/components/dashboard/EnterAnimation";
import { ChatDocumentDrawer } from "@/components/chat/ChatDocumentDrawer";
import { ChatGraphProvider } from "@/components/chat/ChatGraphContext";
import { ChatHistoryTree } from "@/components/chat/ChatHistoryTree";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { cn } from "@/lib/utils/cn";

function ChatRoomDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
          "my-2 mr-1 flex h-[calc(100%-1rem)] w-72 flex-col rounded-3xl border border-slate-900/12 bg-white/70 backdrop-blur-xl transition-[transform,opacity] duration-300 ease-in-out",
          open ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
        )}
      >
        <ChatRoomList className="min-h-0 flex-1 rounded-none border-0 bg-transparent" onClose={onClose} />
      </div>
    </aside>
  );
}

export default function ChatPage() {
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);

  const toggleRooms = () => {
    setRoomsOpen((prev) => !prev);
    setDocumentsOpen(false);
  };

  const toggleDocuments = () => {
    setDocumentsOpen((prev) => !prev);
    setRoomsOpen(false);
  };

  return (
    <ChatGraphProvider>
      <EnterAnimation variant="up" delay={80} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,0.42fr)_minmax(0,1fr)] gap-4 overflow-hidden lg:grid-cols-[minmax(220px,0.78fr)_minmax(0,1.5fr)] lg:grid-rows-1 lg:gap-8 xl:gap-10">
          <ChatHistoryTree className="h-full min-h-0" />

          <div className="flex h-full min-h-0 min-w-0">
            <ChatWindow
              className="min-h-0 min-w-0 flex-1"
              roomsOpen={roomsOpen}
              onToggleRooms={toggleRooms}
              onCloseRooms={() => setRoomsOpen(false)}
              documentsOpen={documentsOpen}
              onToggleDocuments={toggleDocuments}
              onCloseDocuments={() => setDocumentsOpen(false)}
            />
            <ChatRoomDrawer open={roomsOpen} onClose={() => setRoomsOpen(false)} />
            <ChatDocumentDrawer open={documentsOpen} onClose={() => setDocumentsOpen(false)} />
          </div>
        </div>
      </EnterAnimation>
    </ChatGraphProvider>
  );
}
