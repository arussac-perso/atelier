from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base


def _now():
    return datetime.now(timezone.utc)


class AIModelConfig(Base):
    __tablename__ = "ai_model_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)          # Display label
    provider = Column(String(100), nullable=False)      # openai | anthropic | ollama | custom
    model_id = Column(String(255), nullable=False)      # e.g. gpt-4o, claude-3-5-sonnet-20241022
    api_key = Column(Text, nullable=True)               # Stored as plaintext for now (TODO: encrypt)
    api_base = Column(String(500), nullable=True)       # For Ollama / custom endpoints
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    extra_params = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_now)


class TokenUsage(Base):
    __tablename__ = "token_usage"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    model_id = Column(String(255), nullable=False)
    conversation_id = Column(Integer, nullable=True)
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    cost_microdollars = Column(Integer, default=0)  # cost × 1_000_000
    created_at = Column(DateTime, default=_now)

    project = relationship("Project", back_populates="token_usage")
