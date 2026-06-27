"use client";

import { createContext, useContext } from "react";
import { useChatGraph, type ChatGraphContextValue } from "@/hooks/useChatGraph";

const ChatGraphContext = createContext<ChatGraphContextValue | null>(null);

export function ChatGraphProvider({ children }: { children: React.ReactNode }) {
  const value = useChatGraph();
  return <ChatGraphContext.Provider value={value}>{children}</ChatGraphContext.Provider>;
}

export function useChatGraphContext() {
  const ctx = useContext(ChatGraphContext);
  if (!ctx) {
    throw new Error("useChatGraphContext must be used within ChatGraphProvider");
  }
  return ctx;
}
