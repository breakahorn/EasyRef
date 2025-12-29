import os
import shutil
import uuid
from typing import Optional, Protocol

from fastapi import UploadFile
import boto3
from botocore.client import BaseClient


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


class R2StorageBackend:
    """Cloudflare R2 storage using the S3-compatible API."""

    def __init__(
        self,
        bucket: str,
        account_id: str,
        access_key_id: str,
        secret_access_key: str,
        public_base_url: Optional[str] = None,
    ) -> None:
        self.bucket = bucket
        self.public_base_url = public_base_url.rstrip("/") if public_base_url else None
        endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
        self.client: BaseClient = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name="auto",
        )

    def _make_key(self, filename: Optional[str]) -> str:
        if filename:
            base = os.path.basename(filename)
            return f"{uuid.uuid4()}_{base}"
        return str(uuid.uuid4())

    def save_upload(self, upload: UploadFile, filename: Optional[str] = None) -> str:
        key = self._make_key(filename or upload.filename)
        upload.file.seek(0)
        self.client.upload_fileobj(upload.file, self.bucket, key)
        return key

    def delete(self, stored_path: str) -> None:
        if not stored_path:
            return
        try:
            self.client.delete_object(Bucket=self.bucket, Key=stored_path)
        except Exception:
            # Suppress deletion errors to avoid masking caller behavior.
            pass

    def public_url(self, stored_path: str) -> str:
        if self.public_base_url:
            return f"{self.public_base_url}/{stored_path}"
        # If no public base URL, fall back to key (caller may handle).
        return stored_path


def get_storage_backend() -> StorageBackend:
    """Factory that returns the configured storage backend. Defaults to local."""
    backend_name = os.getenv("STORAGE_BACKEND", "local").lower()
    if backend_name == "local":
        base_path = os.getenv("LOCAL_STORAGE_PATH", "./storage")
        return LocalStorageBackend(base_path=base_path)

    if backend_name == "r2":
        required = ["R2_BUCKET", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]
        missing = [key for key in required if not os.getenv(key)]
        if missing:
            raise RuntimeError(f"Missing R2 config: {', '.join(missing)}")
        return R2StorageBackend(
            bucket=os.getenv("R2_BUCKET", ""),
            account_id=os.getenv("R2_ACCOUNT_ID", ""),
            access_key_id=os.getenv("R2_ACCESS_KEY_ID", ""),
            secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY", ""),
            public_base_url=os.getenv("R2_PUBLIC_BASE_URL"),
        )

    # Fallback to local until other backends are implemented or misconfig resolved.
    return LocalStorageBackend(base_path=os.getenv("LOCAL_STORAGE_PATH", "./storage"))
