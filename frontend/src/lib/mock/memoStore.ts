import type {
  CreateMemoInput,
  Memo,
  MemoPositionInput,
  MemoSide,
  UpdateMemoInput,
} from "@/lib/types/memo";
import { getInitialMockMemos } from "./data";

const STORAGE_KEY = "tomato_board_mock_memos";

function normalizeMemo(memo: Memo, index: number): Memo {
  return {
    ...memo,
    side: memo.side ?? (index % 2 === 0 ? "left" : "right"),
    sortOrder: memo.sortOrder ?? index,
  };
}

function loadMemos(): Memo[] {
  if (typeof window === "undefined") {
    return getInitialMockMemos();
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Memo[];
      return parsed.map(normalizeMemo);
    } catch {
      return getInitialMockMemos();
    }
  }
  const initial = getInitialMockMemos();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveMemos(memos: Memo[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
  }
}

function sideMemos(memos: Memo[], side: MemoSide) {
  return memos
    .filter((memo) => memo.side === side)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function renumberSide(memos: Memo[], side: MemoSide) {
  const rows = sideMemos(memos, side);
  rows.forEach((memo, index) => {
    const target = memos.find((item) => item.id === memo.id);
    if (target) target.sortOrder = index;
  });
}

export function getMockMemos(): Memo[] {
  const memos = loadMemos();
  return [...memos].sort((a, b) => {
    if (a.side !== b.side) return a.side.localeCompare(b.side);
    return a.sortOrder - b.sortOrder;
  });
}

export function createMockMemo(input: CreateMemoInput): Memo {
  const memos = loadMemos();
  const side = input.side ?? "left";
  const now = new Date().toISOString();
  const memo: Memo = {
    id: `memo-${Date.now()}`,
    content: input.content,
    color: input.color ?? "#FFF9C4",
    side,
    sortOrder: sideMemos(memos, side).length,
    createdAt: now,
    updatedAt: now,
  };
  memos.push(memo);
  saveMemos(memos);
  return memo;
}

export function updateMockMemo(id: string, input: UpdateMemoInput): Memo {
  const memos = loadMemos();
  const index = memos.findIndex((memo) => memo.id === id);
  if (index === -1) throw new Error("Memo not found");
  memos[index] = {
    ...memos[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  saveMemos(memos);
  return memos[index];
}

function applySideOrder(memos: Memo[], side: MemoSide, ordered: Memo[]) {
  ordered.forEach((memo, index) => {
    const target = memos.find((item) => item.id === memo.id);
    if (target) {
      target.side = side;
      target.sortOrder = index;
    }
  });
}

export function moveMockMemo(id: string, input: MemoPositionInput): Memo {
  const memos = loadMemos();
  const row = memos.find((memo) => memo.id === id);
  if (!row) throw new Error("Memo not found");

  let left = sideMemos(memos, "left").filter((memo) => memo.id !== id);
  let right = sideMemos(memos, "right").filter((memo) => memo.id !== id);

  const target = input.side === "left" ? left : right;
  const index = Math.max(0, Math.min(input.index, target.length));
  row.side = input.side;
  target.splice(index, 0, row);

  if (input.side === "left") left = target;
  else right = target;

  applySideOrder(memos, "left", left);
  applySideOrder(memos, "right", right);
  row.updatedAt = new Date().toISOString();
  saveMemos(memos);
  return row;
}

export function deleteMockMemo(id: string): void {
  const memos = loadMemos();
  const row = memos.find((memo) => memo.id === id);
  if (!row) return;
  const side = row.side;
  const next = memos.filter((memo) => memo.id !== id);
  renumberSide(next, side);
  saveMemos(next);
}
