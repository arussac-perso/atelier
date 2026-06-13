from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models.project import Project
from ..services.context_service import generate_project_context
from ..agents.graph import run_agent

router = APIRouter()


class AgentTaskRequest(BaseModel):
    task: str


class SearchRequest(BaseModel):
    query: str
    limit: int = 5


# ── Context generation ────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/analyze")
async def analyze_project(project_id: int, db: Session = Depends(get_db)):
    """Regenerate the AI context summary for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    try:
        context = await generate_project_context(project_id, db)
        return {"context": context}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ── Agent task ────────────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/agents/run")
async def run_agent_task(
    project_id: int, data: AgentTaskRequest, db: Session = Depends(get_db)
):
    """Run the ReAct agent with file search + web search tools."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    try:
        result = await run_agent(project_id, data.task, db)
        return {"result": result}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ── Semantic search ───────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/search")
def search_project(
    project_id: int, data: SearchRequest, db: Session = Depends(get_db)
):
    """Semantic search over indexed project files."""
    from ..services.indexing_service import search
    from ..config import settings

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    results = search(project_id, data.query, settings.lancedb_path, limit=data.limit)
    return {"results": results}
