import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.chat import Conversation, Message
from ..models.project import Project
from ..models.user import UserProfile
from ..models.agent import TokenUsage  # noqa: F401 — ensure model is imported
from ..schemas.chat import (
    ConversationCreate, ConversationOut, ConversationSummary,
    MessageCreate, MessageOut,
)
from ..services.ai_service import stream_chat

router = APIRouter()


def _require_project(project_id: int, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project


def _build_system_prompt(project: Project, profile: UserProfile | None) -> str:
    user_ctx = ""
    if profile and profile.description:
        user_ctx = f"L'utilisateur est {profile.name or ''}, {profile.job_title or ''}. {profile.description}\n\n"

    project_ctx = ""
    if project.context:
        project_ctx = f"Contexte du projet :\n{project.context}\n\n"

    return (
        f"Tu es un assistant expert travaillant sur le projet '{project.name}'. "
        f"Réponds toujours en français. Sois précis et actionnable.\n\n"
        f"{user_ctx}{project_ctx}"
    )


# ── Conversations ──────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/conversations", response_model=List[ConversationSummary])
def list_conversations(project_id: int, db: Session = Depends(get_db)):
    _require_project(project_id, db)
    convs = (
        db.query(Conversation)
        .filter(Conversation.project_id == project_id)
        .order_by(Conversation.created_at.desc())
        .all()
    )
    return [
        ConversationSummary(
            id=c.id,
            project_id=c.project_id,
            title=c.title,
            message_count=len(c.messages),
            created_at=c.created_at,
        )
        for c in convs
    ]


@router.post(
    "/projects/{project_id}/conversations",
    response_model=ConversationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(project_id: int, data: ConversationCreate, db: Session = Depends(get_db)):
    _require_project(project_id, db)
    conv = Conversation(project_id=project_id, title=data.title)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


@router.get("/projects/{project_id}/conversations/{conv_id}", response_model=ConversationOut)
def get_conversation(project_id: int, conv_id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(
        Conversation.id == conv_id, Conversation.project_id == project_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    return conv


@router.delete("/projects/{project_id}/conversations/{conv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(project_id: int, conv_id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(
        Conversation.id == conv_id, Conversation.project_id == project_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    db.delete(conv)
    db.commit()


# ── Messages / Streaming ──────────────────────────────────────────────────────

@router.post("/projects/{project_id}/conversations/{conv_id}/messages")
async def send_message(
    project_id: int,
    conv_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
):
    """Send a user message and stream the AI response via SSE."""
    project = _require_project(project_id, db)

    conv = db.query(Conversation).filter(
        Conversation.id == conv_id, Conversation.project_id == project_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation introuvable")

    # Persist user message
    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=data.content,
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Build history for the AI
    profile = db.query(UserProfile).first()
    system_content = _build_system_prompt(project, profile)
    history_rows = (
        db.query(Message)
        .filter(Message.conversation_id == conv_id)
        .order_by(Message.created_at)
        .all()
    )
    messages = [{"role": "system", "content": system_content}]
    messages += [{"role": m.role, "content": m.content} for m in history_rows]

    # Auto-title conversation after first user message
    if not conv.title and len(history_rows) == 1:
        conv.title = data.content[:80]
        db.commit()

    # Stream response
    return StreamingResponse(
        stream_chat(messages, project_id, conv_id, db),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/projects/{project_id}/token-usage")
def get_token_usage(project_id: int, db: Session = Depends(get_db)):
    _require_project(project_id, db)
    from ..models.agent import TokenUsage
    rows = db.query(TokenUsage).filter(TokenUsage.project_id == project_id).all()
    total_in = sum(r.tokens_input for r in rows)
    total_out = sum(r.tokens_output for r in rows)
    return {
        "project_id": project_id,
        "total_tokens_input": total_in,
        "total_tokens_output": total_out,
        "total_tokens": total_in + total_out,
        "estimated_cost_usd": sum(r.cost_microdollars for r in rows) / 1_000_000,
    }
