from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base


def _now():
    return datetime.now(timezone.utc)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=_now)

    project = relationship("Project", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(50), nullable=False)     # user | assistant | system | tool
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, default=0)
    model_used = Column(String(255), nullable=True)
    extra = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_now)

    conversation = relationship("Conversation", back_populates="messages")
