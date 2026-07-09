"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Plus, Star, Trash2 } from "lucide-react";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils/cn";

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function FavoriteLinksPanel({ className }: { className?: string }) {
  const theme = useSkyTheme();
  const { favorites, isLoading, createFavorite, deleteFavorite, isCreating, isDeleting } = useFavorites();
  const [nameInput, setNameInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const sortedLinks = useMemo(
    () => [...favorites].sort((a, b) => a.sortOrder - b.sortOrder),
    [favorites],
  );

  const onAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameInput.trim();
    const url = normalizeUrl(urlInput);
    if (!name || !url) return;

    try {
      await createFavorite({ name, url });
      setNameInput("");
      setUrlInput("");
    } catch {
      // Duplicate or invalid URL errors are surfaced by API; keep inputs for quick edit.
    }
  };

  const onDelete = async () => {
    if (!pendingDelete) return;
    await deleteFavorite(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <>
      <section
        className={cn(
          "rounded-2xl border px-4 pt-3 pb-4 sm:px-4 lg-tight:pt-2 lg-tight:pb-3",
          theme.sidebarBorder,
          className,
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <Star className={cn("h-4 w-4 shrink-0", theme.text)} />
          <h2 className={cn("text-sm font-semibold", theme.text)}>즐겨찾기</h2>
        </div>

        <form onSubmit={(event) => void onAdd(event)} className="mb-3 space-y-1.5">
          <input
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            placeholder="사이트 이름"
            className={cn(
              "w-full rounded-md border bg-transparent px-2 py-1.5 text-xs outline-none transition-colors focus:border-[#E74C3C]/60",
              theme.sidebarBorder,
              theme.text,
            )}
          />
          <div className="flex gap-1.5">
            <input
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder="https://example.com"
              className={cn(
                "w-full rounded-md border bg-transparent px-2 py-1.5 text-xs outline-none transition-colors focus:border-[#E74C3C]/60",
                theme.sidebarBorder,
                theme.text,
              )}
            />
            <button
              type="submit"
              disabled={isCreating}
              className={cn(
                "shrink-0 rounded-md px-2 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40",
                theme.muted,
              )}
            >
              <span className="flex items-center gap-1">
                <Plus className="h-3 w-3" />
                추가
              </span>
            </button>
          </div>
        </form>

        {isLoading ? (
          <p className={cn("text-xs", theme.faint)}>불러오는 중...</p>
        ) : sortedLinks.length === 0 ? (
          <p className={cn("text-xs", theme.faint)}>원하는 웹사이트를 추가해보세요.</p>
        ) : (
          <ul className="space-y-2">
            {sortedLinks.map((link) => (
              <li key={link.id} className="flex items-center gap-2.5">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "group flex min-h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-white/10",
                    theme.text,
                  )}
                  title={link.url}
                >
                  <span className="truncate font-medium">{link.name}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                </a>
                <button
                  type="button"
                  onClick={() => setPendingDelete({ id: link.id, name: link.name })}
                  disabled={isDeleting}
                  className={cn(
                    "rounded-md p-1.5 transition-opacity hover:bg-white/10 hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40",
                    theme.faint,
                  )}
                  aria-label={`${link.name} 삭제`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isMounted &&
        pendingDelete &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 px-4">
            <div className={cn("w-full max-w-sm rounded-xl border bg-white p-4 shadow-xl", theme.sidebarBorder)}>
              <p className="text-sm font-semibold text-slate-900">즐겨찾기를 삭제할까요?</p>
              <p className="mt-1 text-sm text-slate-600">
                <span className="font-medium text-slate-800">{pendingDelete.name}</span> 항목이 삭제됩니다.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete()}
                  disabled={isDeleting}
                  className="rounded-md bg-[#E74C3C] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
