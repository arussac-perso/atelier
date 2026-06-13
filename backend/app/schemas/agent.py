from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class AIModelConfigCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    provider: str = Field(..., min_length=1, max_length=100)
    model_id: str = Field(..., min_length=1, max_length=255)
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    is_default: bool = False
    extra_params: Optional[Dict[str, Any]] = None


class AIModelConfigUpdate(BaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None
    extra_params: Optional[Dict[str, Any]] = None


class AIModelConfigOut(BaseModel):
    id: int
    name: str
    provider: str
    model_id: str
    api_base: Optional[str]
    is_default: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenUsageSummary(BaseModel):
    project_id: int
    total_tokens_input: int
    total_tokens_output: int
    total_tokens: int
    estimated_cost_usd: float
