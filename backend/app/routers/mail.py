from fastapi import APIRouter, Depends, Query, Request
from googleapiclient.errors import HttpError
from starlette.concurrency import run_in_threadpool

from app.dependencies import get_google_credentials, google_http_error_to_api, require_user
from app.schemas import MailMessagesResponse, MailSummary, User
from app.services.gmail import fetch_mail_messages, fetch_mail_summary

router = APIRouter(prefix="/mail", tags=["mail"])


@router.get("/summary", response_model=MailSummary)
async def mail_summary(
    request: Request,
    _user: User = Depends(require_user),
):
    credentials = get_google_credentials(request)
    try:
        return await run_in_threadpool(fetch_mail_summary, credentials)
    except HttpError as exc:
        raise google_http_error_to_api(exc, resource="Gmail") from exc


@router.get("/messages", response_model=MailMessagesResponse)
async def mail_messages(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    _user: User = Depends(require_user),
):
    credentials = get_google_credentials(request)
    try:
        return await run_in_threadpool(fetch_mail_messages, credentials, page, limit)
    except HttpError as exc:
        raise google_http_error_to_api(exc, resource="Gmail") from exc
