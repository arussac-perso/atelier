"""
Context service — generates and refreshes an AI context summary for a project.
"""
from sqlalchemy.orm import Session

from ..models.project import Project
from ..models.user import UserProfile
from .ai_service import complete


async def generate_project_context(project_id: int, db: Session) -> str:
    """
    Build a structured project context using the AI.
    Returns the generated context string (also persisted to DB).
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    profile = db.query(UserProfile).first()
    user_description = (
        f"{profile.name}, {profile.job_title}: {profile.description}"
        if profile and profile.description
        else "Utilisateur non configuré"
    )

    # Summarize available files
    files_lines = []
    for f in project.files[:15]:
        preview = (f.content_text or "")[:300].replace("\n", " ")
        files_lines.append(f"- {f.filename}: {preview}{'...' if len(preview) == 300 else ''}")
    files_summary = "\n".join(files_lines) or "Aucun fichier importé"

    # Summarize decisions
    decisions_lines = [
        f"- [{d.status.upper()}] {d.title}"
        for d in project.decisions
    ]
    decisions_summary = "\n".join(decisions_lines) or "Aucune décision enregistrée"

    system_prompt = (
        "Tu es un assistant expert en gestion de projet et aide à la décision. "
        "Réponds toujours en français. Sois structuré, concis et actionnable."
    )

    user_prompt = f"""Génère un contexte de travail pour le projet suivant.

## Profil utilisateur
{user_description}

## Projet : {project.name}
Description : {project.description or "Non définie"}

## Fichiers disponibles
{files_summary}

## Décisions
{decisions_summary}

---

Fournis une analyse structurée avec :
1. **Objectif du projet** — en 2-3 phrases
2. **Informations clés disponibles** — liste à puces
3. **Informations manquantes** — ce qui serait utile d'avoir
4. **Prochaines étapes recommandées** — actions concrètes
5. **Points de vigilance** — risques ou questions ouvertes
"""

    context = await complete(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        db=db,
        max_tokens=1500,
    )

    # Persist
    project.context = context
    db.commit()

    return context
