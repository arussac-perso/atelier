"""
AI service — thin wrapper around LiteLLM.
Handles model resolution, API key injection, and streaming.
"""
from typing import AsyncGenerator, Optional, List, Dict, Any
import litellm
from sqlalchemy.orm import Session

from ..models.agent import AIModelConfig, TokenUsage
from ..database import SessionLocal


def _get_default_model(db: Session) -> Optional[AIModelConfig]:
    return (
        db.query(AIModelConfig)
        .filter(AIModelConfig.is_default == True, AIModelConfig.is_active == True)
        .first()
    )


def _build_litellm_kwargs(model_cfg: AIModelConfig) -> Dict[str, Any]:
    kwargs: Dict[str, Any] = {"model": model_cfg.model_id}
    if model_cfg.api_key:
        kwargs["api_key"] = model_cfg.api_key
    if model_cfg.api_base:
        kwargs["api_base"] = model_cfg.api_base
    if model_cfg.extra_params:
        kwargs.update(model_cfg.extra_params)
    return kwargs


async def stream_chat(
    messages: List[Dict[str, str]],
    project_id: int,
    conversation_id: Optional[int],
    db: Session,
) -> AsyncGenerator[str, None]:
    """
    Stream chat completion tokens as SSE-compatible strings.
    Saves the complete assistant message and token usage to DB after the stream ends.
    """
    model_cfg = _get_default_model(db)
    if not model_cfg:
        yield "data: {\"type\": \"error\", \"message\": \"Aucun modèle IA configuré. Ajoutez un modèle dans les paramètres.\"}\n\n"
        return

    kwargs = _build_litellm_kwargs(model_cfg)
    kwargs["messages"] = messages
    kwargs["stream"] = True

    full_response = ""
    tokens_in = 0
    tokens_out = 0

    try:
        response = await litellm.acompletion(**kwargs)
        async for chunk in response:
            delta = chunk.choices[0].delta.content or ""
            full_response += delta
            if delta:
                import json
                yield f"data: {json.dumps({'type': 'chunk', 'content': delta})}\n\n"

            # Capture usage if provided in last chunk
            if hasattr(chunk, "usage") and chunk.usage:
                tokens_in = getattr(chunk.usage, "prompt_tokens", 0)
                tokens_out = getattr(chunk.usage, "completion_tokens", 0)

    except Exception as exc:
        import json
        yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        return

    # Persist assistant message and token usage using a fresh session
    with SessionLocal() as session:
        from ..models.chat import Message
        assistant_msg = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=full_response,
            tokens_used=tokens_in + tokens_out,
            model_used=model_cfg.model_id,
        )
        session.add(assistant_msg)

        usage = TokenUsage(
            project_id=project_id,
            model_id=model_cfg.model_id,
            conversation_id=conversation_id,
            tokens_input=tokens_in,
            tokens_output=tokens_out,
        )
        session.add(usage)
        session.commit()
        session.refresh(assistant_msg)

        import json
        yield f"data: {json.dumps({'type': 'done', 'message_id': assistant_msg.id})}\n\n"


async def complete(
    messages: List[Dict[str, str]],
    db: Session,
    max_tokens: int = 2000,
) -> str:
    """Non-streaming completion — used internally (context generation, agent tasks)."""
    model_cfg = _get_default_model(db)
    if not model_cfg:
        raise RuntimeError("Aucun modèle IA configuré.")

    kwargs = _build_litellm_kwargs(model_cfg)
    kwargs["messages"] = messages
    kwargs["max_tokens"] = max_tokens

    response = await litellm.acompletion(**kwargs)
    return response.choices[0].message.content or ""
