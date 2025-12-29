import os
import shutil
import uuid
from typing import Optional, Protocol

from fastapi import UploadFile


class StorageBackend(Protocol):
    """Interface for file storage backends."""

    def save_upload(self, upload: UploadFile, filename: Optional[str] = None) -> str:
        """Persist an uploaded file and return the stored path/key."""
        ...

    def delete(self, stored_path: str) -> None:
        """Remove a stored object if it exists."""
        ...

    def public_url(self, stored_path: str) -> str:
        """Return a URL or path that the frontend can use to fetch the object."""
        ...


class LocalStorageBackend:
    """Filesystem-backed storage that writes under a base directory."""

    def __init__(self, base_path: str = "./storage") -> None:
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)

    def _resolve_path(self, filename: str) -> str:
        return os.path.join(self.base_path, filename)

    def save_upload(self, upload: UploadFile, filename: Optional[str] = None) -> str:
        target_name = filename or upload.filename or str(uuid.uuid4())
        target_path = self._resolve_path(target_name)
        with open(target_path, "wb+") as file_object:
            shutil.copyfileobj(upload.file, file_object)
        return target_path

    def delete(self, stored_path: str) -> None:
        if stored_path and os.path.exists(stored_path):
            try:
                os.remove(stored_path)
            except OSError:
                # Swallow deletion errors to avoid masking upstream logic.
                pass

    def public_url(self, stored_path: str) -> str:
        # For local storage we keep returning the filesystem path; the existing
        # /storage/{filename} endpoint serves the file.
        return stored_path


def get_storage_backend() -> StorageBackend:
    """Factory that returns the configured storage backend. Defaults to local."""
    backend_name = os.getenv("STORAGE_BACKEND", "local").lower()
    if backend_name == "local":
        base_path = os.getenv("LOCAL_STORAGE_PATH", "./storage")
        return LocalStorageBackend(base_path=base_path)

    # Fallback to local until other backends are implemented.
    return LocalStorageBackend(base_path=os.getenv("LOCAL_STORAGE_PATH", "./storage"))
