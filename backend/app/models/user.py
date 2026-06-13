from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, Boolean
from ..database import Base


def _now():
    return datetime.now(timezone.utc)


class UserProfile(Base):
    __tablename__ = "user_profile"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)   # Free-text: "Je suis consultant en..."
    preferences = Column(JSON, default=dict)
    onboarded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)
