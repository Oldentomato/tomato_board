from datetime import datetime, time, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.event import DEFAULT_EVENT_COLOR, EventModel
from app.schemas import CalendarEvent, CalendarEventsResponse, CreateEventInput, UpdateEventInput

SEOUL = ZoneInfo("Asia/Seoul")


def _format_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _parse_iso(value: str) -> datetime:
    normalized = value.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=SEOUL)
    return dt.astimezone(timezone.utc)


def _day_bounds(from_date: str, to_date: str) -> tuple[datetime, datetime]:
    start = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=SEOUL)
    end_day = datetime.strptime(to_date, "%Y-%m-%d").replace(tzinfo=SEOUL)
    end = datetime.combine(end_day.date(), time(23, 59, 59, 999999), tzinfo=SEOUL)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


def _to_calendar_event(row: EventModel) -> CalendarEvent:
    return CalendarEvent(
        id=row.id,
        title=row.title,
        start=_format_iso(row.start),
        end=_format_iso(row.end),
        description=row.description,
        color=row.color,
    )


def list_events(db: Session, user_id: str, from_date: str, to_date: str) -> CalendarEventsResponse:
    range_start, range_end = _day_bounds(from_date, to_date)
    rows = db.scalars(
        select(EventModel)
        .where(
            EventModel.user_id == user_id,
            and_(EventModel.start <= range_end, EventModel.end >= range_start),
        )
        .order_by(EventModel.start.asc())
    ).all()
    return CalendarEventsResponse(events=[_to_calendar_event(row) for row in rows])


def create_event(db: Session, user_id: str, input_data: CreateEventInput) -> CalendarEvent:
    title = input_data.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required.")

    start = _parse_iso(input_data.start)
    end = _parse_iso(input_data.end)
    if end <= start:
        raise HTTPException(status_code=400, detail="End must be after start.")

    now = EventModel.utcnow()
    row = EventModel(
        id=str(uuid4()),
        user_id=user_id,
        title=title,
        start=start,
        end=end,
        description=(input_data.description or "").strip() or None,
        color=input_data.color or DEFAULT_EVENT_COLOR,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_calendar_event(row)


def update_event(
    db: Session,
    user_id: str,
    event_id: str,
    input_data: UpdateEventInput,
) -> CalendarEvent:
    row = db.scalar(
        select(EventModel).where(EventModel.id == event_id, EventModel.user_id == user_id)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Event not found.")

    if input_data.title is not None:
        title = input_data.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Title is required.")
        row.title = title
    if input_data.start is not None:
        row.start = _parse_iso(input_data.start)
    if input_data.end is not None:
        row.end = _parse_iso(input_data.end)
    if input_data.description is not None:
        row.description = input_data.description.strip() or None
    if input_data.color is not None:
        row.color = input_data.color

    if row.end <= row.start:
        raise HTTPException(status_code=400, detail="End must be after start.")

    row.updated_at = EventModel.utcnow()
    db.commit()
    db.refresh(row)
    return _to_calendar_event(row)


def delete_event(db: Session, user_id: str, event_id: str) -> None:
    row = db.scalar(
        select(EventModel).where(EventModel.id == event_id, EventModel.user_id == user_id)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Event not found.")
    db.delete(row)
    db.commit()
