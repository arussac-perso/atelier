from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    role: str = "user"


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    tokens_used: int
    model_used: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationCreate(BaseModel):
    title: Optional[str] = None


class ConversationOut(BaseModel):
    id: int
    project_id: int
    title: Optional[str]
    created_at: datetime
    messages: List[MessageOut] = []

    model_config = {"from_attributes": True}


class ConversationSummary(BaseModel):
    id: int
    project_id: int
    title: Optional[str]
    message_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
