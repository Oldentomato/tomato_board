export type MemoSide = "left" | "right";

export type Memo = {
  id: string;
  content: string;
  color: string;
  side: MemoSide;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MemosResponse = {
  memos: Memo[];
};

export type CreateMemoInput = {
  content: string;
  color?: string;
  side?: MemoSide;
};

export type UpdateMemoInput = {
  content?: string;
  color?: string;
};

export type MemoPositionInput = {
  side: MemoSide;
  index: number;
};

export const MEMO_COLORS = [
  { id: "yellow", value: "#FFF9C4", label: "노랑" },
  { id: "pink", value: "#F8BBD0", label: "분홍" },
  { id: "green", value: "#C8E6C9", label: "초록" },
  { id: "blue", value: "#BBDEFB", label: "파랑" },
  { id: "purple", value: "#E1BEE7", label: "보라" },
] as const;

export const DEFAULT_MEMO_COLOR = MEMO_COLORS[0].value;

export function groupMemosBySide(memos: Memo[]) {
  const left = memos
    .filter((memo) => memo.side === "left")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const right = memos
    .filter((memo) => memo.side === "right")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return { left, right };
}
