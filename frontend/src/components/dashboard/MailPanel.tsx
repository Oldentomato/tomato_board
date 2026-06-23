"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Mail, RefreshCw } from "lucide-react";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useMail } from "@/hooks/useMail";
import type { MailMessage } from "@/lib/types/mail";
import { cn } from "@/lib/utils/cn";

function getGmailLink(message: MailMessage) {
  return message.webLink ?? `https://mail.google.com/mail/u/0/#inbox/${message.id}`;
}

export function MailPanel({ className }: { className?: string }) {
  const { summary, messages, unreadCount, isLoading, isFetching, isError, refetch } = useMail();
  const theme = useSkyTheme();

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-2xl border px-4 py-4 sm:px-5 sm:py-4",
        theme.sidebarBorder,
        className,
      )}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className={cn("h-5 w-5", theme.text)} />
          <h2 className={cn("font-semibold", theme.text)}>메일</h2>
          {unreadCount > 0 && (
            <span className="text-xs font-medium text-[#E74C3C]">{unreadCount}</span>
          )}
        </div>
        <button
          type="button"
          onClick={refetch}
          disabled={isFetching}
          className={cn(
            "p-1 transition hover:opacity-70 disabled:opacity-50",
            theme.muted,
          )}
          aria-label="메일 새로고침"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-subtle">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn("h-10 animate-pulse opacity-20", theme.text, "bg-current")} />
            ))}
          </div>
        )}

        {isError && (
          <p className={cn("text-sm", theme.muted)}>메일을 불러올 수 없습니다.</p>
        )}

        {!isLoading && !isError && (
          <ul className="space-y-3">
            {(summary?.recent ?? messages).map((message, index) => (
              <li
                key={message.id}
                className="enter-item"
                style={{ animationDelay: `${400 + index * 60}ms` }}
              >
                <a
                  href={getGmailLink(message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block transition-opacity hover:opacity-80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-sm",
                        !message.isRead
                          ? cn("font-semibold", theme.text)
                          : cn("font-normal", theme.muted),
                      )}
                    >
                      {message.subject || "(제목 없음)"}
                    </p>
                    <time className={cn("shrink-0 text-xs", theme.faint)}>
                      {format(parseISO(message.date), "M/d HH:mm", { locale: ko })}
                    </time>
                  </div>
                  <p className={cn("mt-0.5 truncate text-xs", theme.muted)}>{message.from}</p>
                  <p className={cn("mt-0.5 line-clamp-1 text-xs lg:line-clamp-2", theme.faint)}>
                    {message.snippet}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !isError && !messages.length && !(summary?.recent.length) && (
          <p className={cn("py-4 text-sm", theme.muted)}>받은 메일이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
