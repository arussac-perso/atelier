from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import UserProfile
from ..models.agent import AIModelConfig
from ..schemas.user import UserProfileUpdate, UserProfileOut
from ..schemas.agent import AIModelConfigCreate, AIModelConfigUpdate, AIModelConfigOut

router = APIRouter()


# ── User profile ──────────────────────────────────────────────────────────────

@router.get("/settings/profile", response_model=UserProfileOut)
def get_profile(db: Session = Depends(get_db)):
    profile = db.query(UserProfile).first()
    if not profile:
        # Auto-create empty profile on first access
        profile = UserProfile()
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put("/settings/profile", response_model=UserProfileOut)
def update_profile(data: UserProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile()
        db.add(profile)

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


# ── AI model configs ──────────────────────────────────────────────────────────

@router.get("/settings/models", response_model=List[AIModelConfigOut])
def list_models(db: Session = Depends(get_db)):
    return db.query(AIModelConfig).order_by(AIModelConfig.created_at.desc()).all()


@router.post("/settings/models", response_model=AIModelConfigOut, status_code=status.HTTP_201_CREATED)
def create_model(data: AIModelConfigCreate, db: Session = Depends(get_db)):
    if data.is_default:
        # Unset any existing default
        db.query(AIModelConfig).filter(AIModelConfig.is_default == True).update({"is_default": False})

    model = AIModelConfig(**data.model_dump())
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


@router.put("/settings/models/{model_id}", response_model=AIModelConfigOut)
def update_model(model_id: int, data: AIModelConfigUpdate, db: Session = Depends(get_db)):
    model = db.query(AIModelConfig).filter(AIModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Modèle introuvable")

    if data.is_default:
        db.query(AIModelConfig).filter(
            AIModelConfig.is_default == True, AIModelConfig.id != model_id
        ).update({"is_default": False})

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(model, field, value)

    db.commit()
    db.refresh(model)
    return model


@router.delete("/settings/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(model_id: int, db: Session = Depends(get_db)):
    model = db.query(AIModelConfig).filter(AIModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Modèle introuvable")
    db.delete(model)
    db.commit()
