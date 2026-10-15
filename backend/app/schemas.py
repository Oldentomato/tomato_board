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
    archived: bool = False
    createdAt: str
    updatedAt: str


class CreateMemoInput(BaseModel):
    content: str
    color: str = "#FFF9C4"
    side: str = "left"


class UpdateMemoInput(BaseModel):
    content: Optional[str] = None
    color: Optional[str] = None
    archived: Optional[bool] = None


class MemoPositionInput(BaseModel):
    side: str
    index: int


class MemosResponse(BaseModel):
    memos: list[Memo]


class Favorite(BaseModel):
    id: str
    name: str
    url: str
    sortOrder: int
    createdAt: str
    updatedAt: str


class FavoritesResponse(BaseModel):
    favorites: list[Favorite]


class CreateFavoriteInput(BaseModel):
    name: str
    url: str


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


class Document(BaseModel):
    id: str
    title: str
    originalFilename: str
    sourceFormat: str
    outputFormat: Optional[str] = None
    status: str
    fileSize: int
    mimeType: str
    errorMessage: Optional[str] = None
    createdAt: str
    updatedAt: str


class DocumentsResponse(BaseModel):
    documents: list[Document]


class ConvertDocumentInput(BaseModel):
    content: str
    title: str = "문서"
    target_format: str = "docx"


class DocumentContentResponse(BaseModel):
    documentId: str
    title: str
    sourceFormat: str
    outputFormat: Optional[str] = None
    contentFormat: str
    content: str
    status: str


class UserStorageInfo(BaseModel):
    userId: str
    storagePrefix: str
    createdAt: str
    updatedAt: str


class EmbeddedDocument(BaseModel):
    id: str
    documentId: str
    title: str
    chunkCount: int
    status: str
    errorMessage: Optional[str] = None
    embeddedAt: Optional[str] = None
    createdAt: str
    updatedAt: str


class EmbeddingIndex(BaseModel):
    id: str
    embeddingModel: str
    qdrantCollection: str
    documents: list[EmbeddedDocument]
    documentCount: int
    indexedCount: int
    createdAt: str
    updatedAt: str


class EmbeddingIndexesResponse(BaseModel):
    indexes: list[EmbeddingIndex]


class EmbedDocumentsInput(BaseModel):
    document_ids: list[str] = Field(alias="documentIds")

    model_config = ConfigDict(populate_by_name=True)
