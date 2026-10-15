export type MemoSide = "left" | "right";

export type Memo = {
  id: string;
  content: string;
  color: string;
  side: MemoSide;
  sortOrder: number;
  archived: boolean;
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
  archived?: boolean;
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

export function isArchivedMemo(memo: Memo) {
  return Boolean(memo.archived);
}

export function groupMemosBySide(memos: Memo[]) {
  const active = memos.filter((memo) => !isArchivedMemo(memo));
  const left = active
    .filter((memo) => memo.side === "left")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const right = active
    .filter((memo) => memo.side === "right")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return { left, right };
}

export function getArchivedMemos(memos: Memo[]) {
  return memos
    .filter(isArchivedMemo)
    .sort((a, b) => {
      const byUpdated = b.updatedAt.localeCompare(a.updatedAt);
      if (byUpdated !== 0) return byUpdated;
      return a.id.localeCompare(b.id);
    });
}
