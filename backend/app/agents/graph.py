"""
LangGraph agent graph — ReAct agent with project-aware tools.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..models.agent import AIModelConfig
from ..models.project import Project
from ..models.user import UserProfile
from .tools import make_tools
from ..config import settings


def _get_langchain_model(model_cfg: AIModelConfig):
    """Wrap an AIModelConfig into a LangChain-compatible chat model via LiteLLM."""
    from langchain_community.chat_models import ChatLiteLLM

    kwargs: Dict[str, Any] = {"model": model_cfg.model_id}
    if model_cfg.api_key:
        kwargs["api_key"] = model_cfg.api_key
    if model_cfg.api_base:
        kwargs["api_base"] = model_cfg.api_base

    return ChatLiteLLM(**kwargs)


async def run_agent(
    project_id: int,
    task: str,
    db: Session,
) -> str:
    """
    Run the ReAct agent for a given task and project.
    Returns the final answer as a string.
    """
    from langgraph.prebuilt import create_react_agent
    from langchain_core.messages import HumanMessage, SystemMessage

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    profile = db.query(UserProfile).first()
    user_context = (
        f"L'utilisateur est {profile.name}, {profile.job_title}. {profile.description}"
        if profile and profile.description
        else ""
    )

    model_cfg = (
        db.query(AIModelConfig)
        .filter(AIModelConfig.is_default == True, AIModelConfig.is_active == True)
        .first()
    )
    if not model_cfg:
        raise RuntimeError("Aucun modèle IA configuré.")

    lm = _get_langchain_model(model_cfg)
    tools = make_tools(project_id, settings.lancedb_path)

    system_prompt = (
        f"Tu es un assistant expert en gestion de projet. "
        f"Tu travailles sur le projet '{project.name}'. "
        f"{user_context} "
        f"Réponds toujours en français. Sois précis, structuré et actionnable. "
        f"Utilise les outils disponibles pour chercher des informations dans les fichiers du projet."
    )

    agent = create_react_agent(lm, tools)

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=task),
    ]

    result = await agent.ainvoke({"messages": messages})
    final_messages = result.get("messages", [])

    # Return content of the last AI message
    for msg in reversed(final_messages):
        if hasattr(msg, "content") and msg.content and getattr(msg, "type", None) != "tool":
            return msg.content

    return "L'agent n'a pas pu produire de réponse."
