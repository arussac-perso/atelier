from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routes import projects, files, chat, settings, agents


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all DB tables on startup
    Base.metadata.create_all(bind=engine)
    # Ensure data directory exists
    from app.config import settings as cfg
    cfg.data_dir.mkdir(parents=True, exist_ok=True)
    (cfg.data_dir / "files").mkdir(exist_ok=True)
    yield


app = FastAPI(
    title="Atelier API",
    version="0.1.0",
    description="API backend pour Atelier — outil de gestion de projet IA",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "http://localhost:5173",
        "tauri://localhost",
        "https://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api/v1", tags=["projects"])
app.include_router(files.router, prefix="/api/v1", tags=["files"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(settings.router, prefix="/api/v1", tags=["settings"])
app.include_router(agents.router, prefix="/api/v1", tags=["agents"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
