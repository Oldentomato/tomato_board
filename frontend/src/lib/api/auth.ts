import { isMockMode } from "@/lib/config/env";
import { mockGetMe, mockLogout } from "@/lib/mock/handlers";
import { apiClient, getApiUrl } from "./client";
import type { User } from "@/lib/types/auth";

export function getGoogleLoginUrl() {
  return `${getApiUrl()}/auth/google`;
}

export function getMe() {
  if (isMockMode()) return mockGetMe();
  return apiClient<User>("/auth/me");
}

export function logout() {
  if (isMockMode()) return mockLogout();
  return apiClient<void>("/auth/logout", { method: "POST" });
}
