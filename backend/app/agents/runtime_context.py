from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

DEFAULT_TIMEZONE = "Asia/Seoul"
DEFAULT_LOCALE = "ko-KR"


def get_runtime_context(
    *,
    timezone_name: str = DEFAULT_TIMEZONE,
    locale: str = DEFAULT_LOCALE,
) -> dict[str, str]:
    """Machine-usable facts about 'now'. Not prompt examples — shared ground truth."""
    tz = ZoneInfo(timezone_name)
    now = datetime.now(tz)
    return {
        "timezone": timezone_name,
        "locale": locale,
        "iso_datetime": now.isoformat(timespec="seconds"),
        "local_date": now.strftime("%Y-%m-%d"),
        "local_time": now.strftime("%H:%M:%S"),
        "weekday": now.strftime("%A"),
        "human": now.strftime("%Y년 %m월 %d일 %H:%M (%A, %Z)"),
    }


def format_runtime_context_block(
    *,
    timezone_name: str = DEFAULT_TIMEZONE,
    locale: str = DEFAULT_LOCALE,
) -> str:
    ctx = get_runtime_context(timezone_name=timezone_name, locale=locale)
    return (
        "# Runtime context (authoritative)\n"
        f"- Current local datetime: {ctx['human']}\n"
        f"- ISO datetime: {ctx['iso_datetime']}\n"
        f"- Timezone: {ctx['timezone']}\n"
        f"- Locale: {ctx['locale']}\n"
        "Use this block whenever the user refers to relative time "
        "(today, yesterday, this week, now, recently, etc.)."
    )
