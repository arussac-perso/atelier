from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.project import Project, Decision
from ..schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectOut, ProjectSummary,
    DecisionCreate, DecisionUpdate, DecisionOut,
)

router = APIRouter()


# ── Projects ──────────────────────────────────────────────────────────────────

@router.get("/projects", response_model=List[ProjectSummary])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    result = []
    for p in projects:
        result.append(
            ProjectSummary(
                id=p.id,
                name=p.name,
                description=p.description,
                status=p.status,
                file_count=len(p.files),
                decision_count=len(p.decisions),
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )
    return result


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(name=data.name, description=data.description)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project


@router.put("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    db.delete(project)
    db.commit()


# ── Decisions ─────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/decisions", response_model=List[DecisionOut])
def list_decisions(project_id: int, db: Session = Depends(get_db)):
    _require_project(project_id, db)
    return db.query(Decision).filter(Decision.project_id == project_id).order_by(Decision.created_at.desc()).all()


@router.post("/projects/{project_id}/decisions", response_model=DecisionOut, status_code=status.HTTP_201_CREATED)
def create_decision(project_id: int, data: DecisionCreate, db: Session = Depends(get_db)):
    _require_project(project_id, db)
    decision = Decision(project_id=project_id, **data.model_dump())
    db.add(decision)
    db.commit()
    db.refresh(decision)
    return decision


@router.put("/projects/{project_id}/decisions/{decision_id}", response_model=DecisionOut)
def update_decision(project_id: int, decision_id: int, data: DecisionUpdate, db: Session = Depends(get_db)):
    decision = db.query(Decision).filter(
        Decision.id == decision_id, Decision.project_id == project_id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Décision introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(decision, field, value)
    db.commit()
    db.refresh(decision)
    return decision


@router.delete("/projects/{project_id}/decisions/{decision_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_decision(project_id: int, decision_id: int, db: Session = Depends(get_db)):
    decision = db.query(Decision).filter(
        Decision.id == decision_id, Decision.project_id == project_id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Décision introuvable")
    db.delete(decision)
    db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_project(project_id: int, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project
