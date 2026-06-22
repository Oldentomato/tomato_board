"use client";

import { useQuery } from "@tanstack/react-query";
import { getMailMessages, getMailSummary } from "@/lib/api/mail";

export function useMail() {
  const summaryQuery = useQuery({
    queryKey: ["mail", "summary"],
    queryFn: getMailSummary,
    staleTime: 2 * 60 * 1000,
  });

  const messagesQuery = useQuery({
    queryKey: ["mail", "messages"],
    queryFn: () => getMailMessages(1, 10),
    staleTime: 2 * 60 * 1000,
  });

  return {
    summary: summaryQuery.data,
    messages: messagesQuery.data?.messages ?? [],
    unreadCount: summaryQuery.data?.unreadCount ?? 0,
    isLoading: summaryQuery.isLoading || messagesQuery.isLoading,
    isError: summaryQuery.isError || messagesQuery.isError,
    refetch: () => {
      summaryQuery.refetch();
      messagesQuery.refetch();
    },
  };
}
