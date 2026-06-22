from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.schemas import CalendarEvent, CalendarEventsResponse, CreateEventInput, UpdateEventInput

DEFAULT_COLOR = "#E74C3C"


def _build_calendar_service(credentials: Credentials):
    return build("calendar", "v3", credentials=credentials, cache_discovery=False)


def _to_calendar_event(item: dict) -> CalendarEvent:
    color = None
    if item.get("colorId"):
        color = DEFAULT_COLOR

    extended = item.get("extendedProperties", {}).get("private", {})
    if extended.get("color"):
        color = extended["color"]

    return CalendarEvent(
        id=item["id"],
        title=item.get("summary", "(제목 없음)"),
        start=item["start"].get("dateTime") or f"{item['start'].get('date')}T00:00:00+09:00",
        end=item["end"].get("dateTime") or f"{item['end'].get('date')}T23:59:59+09:00",
        description=item.get("description"),
        color=color,
    )


def fetch_events(credentials: Credentials, from_date: str, to_date: str) -> CalendarEventsResponse:
    service = _build_calendar_service(credentials)

    time_min = f"{from_date}T00:00:00+09:00"
    time_max = f"{to_date}T23:59:59+09:00"

    response = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )

    events = [_to_calendar_event(item) for item in response.get("items", [])]
    return CalendarEventsResponse(events=events)


def create_event(credentials: Credentials, input_data: CreateEventInput) -> CalendarEvent:
    service = _build_calendar_service(credentials)

    body: dict = {
        "summary": input_data.title,
        "start": {"dateTime": input_data.start, "timeZone": "Asia/Seoul"},
        "end": {"dateTime": input_data.end, "timeZone": "Asia/Seoul"},
    }

    if input_data.description:
        body["description"] = input_data.description

    if input_data.color:
        body["extendedProperties"] = {"private": {"color": input_data.color}}

    created = service.events().insert(calendarId="primary", body=body).execute()
    event = _to_calendar_event(created)
    if input_data.color:
        event.color = input_data.color
    return event


def update_event(credentials: Credentials, event_id: str, input_data: UpdateEventInput) -> CalendarEvent:
    service = _build_calendar_service(credentials)

    existing = service.events().get(calendarId="primary", eventId=event_id).execute()

    if input_data.title is not None:
        existing["summary"] = input_data.title
    if input_data.start is not None:
        existing["start"] = {"dateTime": input_data.start, "timeZone": "Asia/Seoul"}
    if input_data.end is not None:
        existing["end"] = {"dateTime": input_data.end, "timeZone": "Asia/Seoul"}
    if input_data.description is not None:
        existing["description"] = input_data.description
    if input_data.color is not None:
        existing.setdefault("extendedProperties", {}).setdefault("private", {})["color"] = input_data.color

    updated = service.events().update(calendarId="primary", eventId=event_id, body=existing).execute()
    event = _to_calendar_event(updated)

    if input_data.color is not None:
        event.color = input_data.color
    elif existing.get("extendedProperties", {}).get("private", {}).get("color"):
        event.color = existing["extendedProperties"]["private"]["color"]

    return event


def delete_event(credentials: Credentials, event_id: str) -> None:
    service = _build_calendar_service(credentials)
    service.events().delete(calendarId="primary", eventId=event_id).execute()
