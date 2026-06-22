import { isMockMode } from "@/lib/config/env";
import { mockGetMailMessages, mockGetMailSummary } from "@/lib/mock/handlers";
import { apiClient } from "./client";
import type { MailMessagesResponse, MailSummary } from "@/lib/types/mail";

export function getMailSummary() {
  if (isMockMode()) return mockGetMailSummary();
  return apiClient<MailSummary>("/mail/summary");
}

export function getMailMessages(page = 1, limit = 10) {
  if (isMockMode()) return mockGetMailMessages(page, limit);
  return apiClient<MailMessagesResponse>("/mail/messages", {
    params: { page, limit },
  });
}
