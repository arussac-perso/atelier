from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    job_title: Optional[str] = None
    description: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    onboarded: Optional[bool] = None


class UserProfileOut(BaseModel):
    id: int
    name: Optional[str]
    job_title: Optional[str]
    description: Optional[str]
    preferences: Dict[str, Any]
    onboarded: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
