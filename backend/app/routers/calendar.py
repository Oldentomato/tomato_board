from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.database import get_db
from app.dependencies import require_user
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
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(
        calendar_service.list_events,
        db,
        user.id,
        from_date,
        to_date,
    )


@router.post("/events", response_model=CalendarEvent, status_code=201)
async def create_event(
    body: CreateEventInput,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(calendar_service.create_event, db, user.id, body)


@router.put("/events/{event_id}", response_model=CalendarEvent)
async def update_event(
    event_id: str,
    body: UpdateEventInput,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(
        calendar_service.update_event,
        db,
        user.id,
        event_id,
        body,
    )


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    await run_in_threadpool(calendar_service.delete_event, db, user.id, event_id)
    return Response(status_code=204)
