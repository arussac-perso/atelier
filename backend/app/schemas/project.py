from datetime import datetime
from typing import Optional, List, Any, Dict
from enum import Enum
from pydantic import BaseModel, Field


class ProjectStatus(str, Enum):
    active = "active"
    archived = "archived"
    completed = "completed"


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    context: Optional[str] = None
    status: Optional[ProjectStatus] = None


class ProjectFileOut(BaseModel):
    id: int
    project_id: int
    filename: str
    file_type: Optional[str]
    file_size: Optional[int]
    indexed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DecisionStatus(str, Enum):
    pending = "pending"
    taken = "taken"
    rejected = "rejected"


class DecisionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    rationale: Optional[str] = None
    status: DecisionStatus = DecisionStatus.pending


class DecisionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    rationale: Optional[str] = None
    status: Optional[DecisionStatus] = None


class DecisionOut(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str]
    rationale: Optional[str]
    status: str
    source: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    context: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    files: List[ProjectFileOut] = []
    decisions: List[DecisionOut] = []

    model_config = {"from_attributes": True}


class ProjectSummary(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    file_count: int = 0
    decision_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
