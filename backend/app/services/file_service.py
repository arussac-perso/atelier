"""
File processing service — extracts plain text from various file formats.
"""
import mimetypes
from pathlib import Path
from typing import Optional


def extract_text(filepath: str) -> str:
    """Extract plain text from a file. Returns empty string on failure."""
    path = Path(filepath)
    ext = path.suffix.lower()

    extractors = {
        ".pdf": _extract_pdf,
        ".docx": _extract_docx,
        ".doc": _extract_docx,
    }
    text_exts = {".txt", ".md", ".csv", ".json", ".xml", ".html", ".htm", ".rst", ".log", ".yaml", ".yml"}

    if ext in extractors:
        return extractors[ext](filepath)
    elif ext in text_exts:
        return _read_text(filepath)
    else:
        # Fallback: attempt to read as text
        return _read_text(filepath)


def get_mime_type(filepath: str) -> str:
    mime, _ = mimetypes.guess_type(filepath)
    return mime or "application/octet-stream"


def _read_text(filepath: str) -> str:
    try:
        return Path(filepath).read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def _extract_pdf(filepath: str) -> str:
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(filepath)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception:
        return ""


def _extract_docx(filepath: str) -> str:
    try:
        from docx import Document
        doc = Document(filepath)
        return "\n".join(para.text for para in doc.paragraphs if para.text)
    except Exception:
        return ""
