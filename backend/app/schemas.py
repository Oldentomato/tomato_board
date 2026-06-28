from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class User(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None


class TodayWeather(BaseModel):
    date: str
    temp: float
    feelsLike: float
    condition: str
    icon: str
    humidity: int
    windSpeed: float
    location: str


class DayForecast(BaseModel):
    date: str
    tempMin: float
    tempMax: float
    condition: str
    icon: str
    precipitation: int


class WeekWeather(BaseModel):
    days: list[DayForecast]


class MailMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True, ser_json_by_alias=True)

    id: str
    subject: str
    from_: str = Field(alias="from")
    snippet: str
    date: str
    isRead: bool
    webLink: Optional[str] = None


class MailSummary(BaseModel):
    unreadCount: int
    recent: list[MailMessage]


class MailMessagesResponse(BaseModel):
    messages: list[MailMessage]
    total: int


class CalendarEvent(BaseModel):
    id: str
    title: str
    start: str
    end: str
    description: Optional[str] = None
    color: Optional[str] = None


class CreateEventInput(BaseModel):
    title: str
    start: str
    end: str
    description: Optional[str] = None
    color: Optional[str] = None


class UpdateEventInput(BaseModel):
    title: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class CalendarEventsResponse(BaseModel):
    events: list[CalendarEvent]


class Memo(BaseModel):
    id: str
    content: str
    color: str
    side: str
    sortOrder: int
    createdAt: str
    updatedAt: str


class CreateMemoInput(BaseModel):
    content: str
    color: str = "#FFF9C4"
    side: str = "left"


class UpdateMemoInput(BaseModel):
    content: Optional[str] = None
    color: Optional[str] = None


class MemoPositionInput(BaseModel):
    side: str
    index: int


class MemosResponse(BaseModel):
    memos: list[Memo]


class ChatMessageNode(BaseModel):
    id: str
    role: str
    content: str
    createdAt: str
    parentId: Optional[str] = None
    childIds: list[str] = Field(default_factory=list)
    thought: Optional[str] = None


class ChatGraph(BaseModel):
    roomId: str
    nodes: dict[str, ChatMessageNode]
    rootId: str


class ChatRoom(BaseModel):
    id: str
    title: str
    updatedAt: str
    preview: str


class ChatRoomsResponse(BaseModel):
    rooms: list[ChatRoom]


class CreateChatRoomResponse(BaseModel):
    room: ChatRoom
    graph: ChatGraph


class AgentInfo(BaseModel):
    id: str
    label: str
    description: str = ""


class AgentsResponse(BaseModel):
    agents: list[AgentInfo]


class SendChatMessageInput(BaseModel):
    parentId: str
    content: str
    agentId: Optional[str] = None


class SendChatMessageResponse(BaseModel):
    graph: ChatGraph
    activeNodeId: str


class PrepareChatMessageResponse(BaseModel):
    graph: ChatGraph
    userNodeId: str
    assistantNodeId: str


class FinalizeChatMessageInput(BaseModel):
    content: str
    thought: Optional[str] = None
