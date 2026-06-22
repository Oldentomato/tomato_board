from fastapi import APIRouter, Depends, Query, Request, Response
from googleapiclient.errors import HttpError
from starlette.concurrency import run_in_threadpool

from app.dependencies import get_google_credentials, google_http_error_to_api, require_user
from app.schemas import (
    CalendarEvent,
    CalendarEventsResponse,
    CreateEventInput,
    UpdateEventInput,
    User,
)
from app.services import calendar as calendar_service

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/events", response_model=CalendarEventsResponse)
async def list_events(
    request: Request,
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
    _user: User = Depends(require_user),
):
    credentials = get_google_credentials(request)
    try:
        return await run_in_threadpool(calendar_service.fetch_events, credentials, from_date, to_date)
    except HttpError as exc:
        raise google_http_error_to_api(exc, resource="Calendar") from exc


@router.post("/events", response_model=CalendarEvent, status_code=201)
async def create_event(
    request: Request,
    body: CreateEventInput,
    _user: User = Depends(require_user),
):
    credentials = get_google_credentials(request)
    try:
        return await run_in_threadpool(calendar_service.create_event, credentials, body)
    except HttpError as exc:
        raise google_http_error_to_api(exc, resource="Calendar") from exc


@router.put("/events/{event_id}", response_model=CalendarEvent)
async def update_event(
    request: Request,
    event_id: str,
    body: UpdateEventInput,
    _user: User = Depends(require_user),
):
    credentials = get_google_credentials(request)
    try:
        return await run_in_threadpool(calendar_service.update_event, credentials, event_id, body)
    except HttpError as exc:
        raise google_http_error_to_api(
            exc,
            resource="Calendar",
            not_found_detail="Event not found.",
        ) from exc


@router.delete("/events/{event_id}")
async def delete_event(
    request: Request,
    event_id: str,
    _user: User = Depends(require_user),
):
    credentials = get_google_credentials(request)
    try:
        await run_in_threadpool(calendar_service.delete_event, credentials, event_id)
    except HttpError as exc:
        raise google_http_error_to_api(
            exc,
            resource="Calendar",
            not_found_detail="Event not found.",
        ) from exc

    return Response(status_code=204)
