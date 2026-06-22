from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.schemas import MailMessage, MailMessagesResponse, MailSummary


def _parse_header(headers: list[dict], name: str) -> str:
    for header in headers:
        if header.get("name", "").lower() == name.lower():
            return header.get("value", "")
    return ""


def _format_from(from_header: str) -> str:
    return from_header or "Unknown"


def _to_mail_message(msg: dict, include_web_link: bool = False) -> MailMessage:
    headers = msg.get("payload", {}).get("headers", [])
    subject = _parse_header(headers, "Subject") or "(제목 없음)"
    from_header = _format_from(_parse_header(headers, "From"))
    snippet = msg.get("snippet", "")
    label_ids = msg.get("labelIds", [])
    is_read = "UNREAD" not in label_ids

    internal_date = msg.get("internalDate")
    if internal_date:
        date = datetime.fromtimestamp(int(internal_date) / 1000, tz=timezone.utc).isoformat()
    else:
        date_header = _parse_header(headers, "Date")
        try:
            date = parsedate_to_datetime(date_header).isoformat() if date_header else datetime.now(tz=timezone.utc).isoformat()
        except (TypeError, ValueError):
            date = datetime.now(tz=timezone.utc).isoformat()

    web_link = None
    if include_web_link:
        web_link = f"https://mail.google.com/mail/u/0/#inbox/{msg['id']}"

    return MailMessage(
        id=msg["id"],
        subject=subject,
        from_=from_header,
        snippet=snippet,
        date=date,
        isRead=is_read,
        webLink=web_link,
    )


def _build_gmail_service(credentials: Credentials):
    return build("gmail", "v1", credentials=credentials, cache_discovery=False)


def fetch_mail_summary(credentials: Credentials) -> MailSummary:
    service = _build_gmail_service(credentials)

    unread_response = service.users().messages().list(userId="me", q="is:unread", maxResults=1).execute()
    unread_count = unread_response.get("resultSizeEstimate", 0)

    list_response = service.users().messages().list(userId="me", maxResults=5).execute()
    messages: list[MailMessage] = []

    for item in list_response.get("messages", []):
        msg = (
            service.users()
            .messages()
            .get(
                userId="me",
                id=item["id"],
                format="metadata",
                metadataHeaders=["Subject", "From", "Date"],
            )
            .execute()
        )
        messages.append(_to_mail_message(msg))

    return MailSummary(unreadCount=unread_count, recent=messages)


def fetch_mail_messages(credentials: Credentials, page: int = 1, limit: int = 10) -> MailMessagesResponse:
    service = _build_gmail_service(credentials)

    list_response = service.users().messages().list(userId="me", maxResults=100).execute()
    all_ids = [item["id"] for item in list_response.get("messages", [])]
    total = len(all_ids)

    start = (page - 1) * limit
    page_ids = all_ids[start : start + limit]

    messages: list[MailMessage] = []
    for msg_id in page_ids:
        msg = (
            service.users()
            .messages()
            .get(
                userId="me",
                id=msg_id,
                format="metadata",
                metadataHeaders=["Subject", "From", "Date"],
            )
            .execute()
        )
        messages.append(_to_mail_message(msg, include_web_link=True))

    return MailMessagesResponse(messages=messages, total=total)
