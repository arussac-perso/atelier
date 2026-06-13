from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from ..database import Base


def _now():
    return datetime.now(timezone.utc)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    context = Column(Text, nullable=True)          # AI-generated project context
    status = Column(String(50), default="active")  # active | archived | completed
    extra = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="project", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="project", cascade="all, delete-orphan")
    token_usage = relationship("TokenUsage", back_populates="project", cascade="all, delete-orphan")


class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(1024), nullable=False)   # Absolute path on disk
    file_type = Column(String(100), nullable=True)    # MIME type
    content_text = Column(Text, nullable=True)        # Extracted plain text
    indexed = Column(Boolean, default=False)
    file_size = Column(Integer, nullable=True)
    extra = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_now)

    project = relationship("Project", back_populates="files")


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    rationale = Column(Text, nullable=True)
    status = Column(String(50), default="pending")  # pending | taken | rejected
    source = Column(String(100), default="manual")  # manual | agent
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    project = relationship("Project", back_populates="decisions")
