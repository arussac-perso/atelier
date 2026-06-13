import shutil
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, BackgroundTasks, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.project import Project, ProjectFile
from ..schemas.project import ProjectFileOut
from ..services import file_service, indexing_service
from ..config import settings

router = APIRouter()


def _require_project(project_id: int, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project


def _index_file_background(file_id: int, project_id: int, filepath: str, filename: str):
    """Background task: extract text and index into LanceDB."""
    from ..database import SessionLocal
    text = file_service.extract_text(filepath)
    with SessionLocal() as db:
        pf = db.query(ProjectFile).filter(ProjectFile.id == file_id).first()
        if pf:
            pf.content_text = text
            pf.indexed = False
            db.commit()

    count = indexing_service.index_file(
        project_id=project_id,
        file_id=file_id,
        filename=filename,
        text=text,
        lancedb_path=settings.lancedb_path,
    )

    with SessionLocal() as db:
        pf = db.query(ProjectFile).filter(ProjectFile.id == file_id).first()
        if pf:
            pf.indexed = count > 0
            db.commit()


@router.post(
    "/projects/{project_id}/files",
    response_model=ProjectFileOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    project_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    _require_project(project_id, db)

    # Save file to disk
    dest_dir = settings.files_dir / str(project_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / file.filename

    # Prevent path traversal
    if not dest_path.resolve().is_relative_to(settings.files_dir.resolve()):
        raise HTTPException(status_code=400, detail="Nom de fichier invalide")

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = dest_path.stat().st_size
    mime_type = file_service.get_mime_type(str(dest_path))

    pf = ProjectFile(
        project_id=project_id,
        filename=file.filename,
        filepath=str(dest_path),
        file_type=mime_type,
        file_size=file_size,
    )
    db.add(pf)
    db.commit()
    db.refresh(pf)

    # Index asynchronously
    background_tasks.add_task(
        _index_file_background, pf.id, project_id, str(dest_path), file.filename
    )

    return pf


@router.get("/projects/{project_id}/files", response_model=List[ProjectFileOut])
def list_files(project_id: int, db: Session = Depends(get_db)):
    _require_project(project_id, db)
    return (
        db.query(ProjectFile)
        .filter(ProjectFile.project_id == project_id)
        .order_by(ProjectFile.created_at.desc())
        .all()
    )


@router.get("/projects/{project_id}/files/{file_id}", response_model=ProjectFileOut)
def get_file(project_id: int, file_id: int, db: Session = Depends(get_db)):
    pf = db.query(ProjectFile).filter(
        ProjectFile.id == file_id, ProjectFile.project_id == project_id
    ).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    return pf


@router.delete("/projects/{project_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(project_id: int, file_id: int, db: Session = Depends(get_db)):
    pf = db.query(ProjectFile).filter(
        ProjectFile.id == file_id, ProjectFile.project_id == project_id
    ).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    # Remove from disk
    try:
        Path(pf.filepath).unlink(missing_ok=True)
    except Exception:
        pass

    # Remove from vector index
    indexing_service.delete_file_index(project_id, file_id, settings.lancedb_path)

    db.delete(pf)
    db.commit()
