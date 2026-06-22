import { isMockMode } from "@/lib/config/env";
import {
  mockCreateMemo,
  mockDeleteMemo,
  mockGetMemos,
  mockMoveMemo,
  mockUpdateMemo,
} from "@/lib/mock/handlers";
import { apiClient } from "./client";
import type {
  CreateMemoInput,
  Memo,
  MemoPositionInput,
  MemosResponse,
  UpdateMemoInput,
} from "@/lib/types/memo";

export function getMemos() {
  if (isMockMode()) return mockGetMemos();
  return apiClient<MemosResponse>("/memos");
}

export function createMemo(input: CreateMemoInput) {
  if (isMockMode()) return mockCreateMemo(input);
  return apiClient<Memo>("/memos", {
    method: "POST",
    body: input,
  });
}

export function updateMemo(id: string, input: UpdateMemoInput) {
  if (isMockMode()) return mockUpdateMemo(id, input);
  return apiClient<Memo>(`/memos/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteMemo(id: string) {
  if (isMockMode()) return mockDeleteMemo(id);
  return apiClient<void>(`/memos/${id}`, {
    method: "DELETE",
  });
}

export function moveMemo(id: string, input: MemoPositionInput) {
  if (isMockMode()) return mockMoveMemo(id, input);
  return apiClient<Memo>(`/memos/${id}/position`, {
    method: "PATCH",
    body: input,
  });
}
