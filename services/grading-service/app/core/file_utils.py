import os
import uuid
from pathlib import Path
from typing import Optional

from app.core.config import settings


def ensure_upload_dir():
    """Ensure upload directory exists."""
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def save_upload_file(file, subfolder: str = "assignments") -> tuple[str, int]:
    """
    Save uploaded file and return (file_path, file_size).
    
    Args:
        file: UploadFile from FastAPI
        subfolder: Subfolder within upload directory
    
    Returns:
        Tuple of (relative_file_path, file_size_in_bytes)
    """
    # Create subfolder
    upload_dir = ensure_upload_dir()
    subfolder_path = upload_dir / subfolder
    subfolder_path.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = subfolder_path / unique_filename
    
    # Save file
    file_size = 0
    with open(file_path, "wb") as f:
        content = file.file.read()
        f.write(content)
        file_size = len(content)
    
    # Return relative path
    relative_path = str(file_path.relative_to(upload_dir))
    return relative_path, file_size


def delete_file(file_path: str):
    """Delete a file from upload directory."""
    try:
        full_path = Path(settings.UPLOAD_DIR) / file_path
        if full_path.exists():
            full_path.unlink()
    except Exception as e:
        print(f"Error deleting file {file_path}: {e}")


def validate_file_size(file_size: int) -> bool:
    """Check if file size is within limit."""
    return file_size <= settings.MAX_FILE_SIZE


def validate_mime_type(content_type: str) -> bool:
    """Check if MIME type is allowed."""
    return content_type in settings.ALLOWED_MIME_TYPES
