from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Atelier"
    database_url: str = "sqlite:///./atelier.db"
    data_dir: Path = Path.home() / ".atelier"

    @property
    def lancedb_path(self) -> str:
        return str(self.data_dir / "vectors")

    @property
    def files_dir(self) -> Path:
        return self.data_dir / "files"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
