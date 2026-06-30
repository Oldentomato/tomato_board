from __future__ import annotations

import hashlib
import io
import logging
from pathlib import Path

from minio import Minio
from minio.error import S3Error

from app.config import BACKEND_ROOT, get_settings

logger = logging.getLogger(__name__)

_client: Minio | None = None
LOCAL_STORAGE_ROOT = BACKEND_ROOT / ".local_storage"


def uses_local_storage() -> bool:
    settings = get_settings()
    return settings.minio_use_local_storage or not settings.minio_configured


def _legacy_local_path(object_key: str) -> Path:
    return LOCAL_STORAGE_ROOT / object_key.replace("/", "_").replace("\\", "_")


def _hashed_local_path(object_key: str) -> Path:
    digest = hashlib.sha256(object_key.encode("utf-8")).hexdigest()
    suffix = Path(object_key).suffix or ".bin"
    return LOCAL_STORAGE_ROOT / f"{digest}{suffix}"


def _local_path(object_key: str) -> Path:
    hashed = _hashed_local_path(object_key)
    if hashed.is_file():
        return hashed
    return _legacy_local_path(object_key)


def _read_local_object(object_key: str) -> bytes:
    for path in (_hashed_local_path(object_key), _legacy_local_path(object_key)):
        if path.is_file():
            return path.read_bytes()
    raise FileNotFoundError(f"Local object not found: {object_key}")


def _get_client() -> Minio:
    global _client
    if _client is not None:
        return _client

    settings = get_settings()
    if not settings.minio_configured:
        raise RuntimeError("MinIO가 설정되지 않았습니다. MINIO_ENDPOINT 등 환경변수를 확인하세요.")

    _client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )
    return _client


def ensure_bucket() -> None:
    if uses_local_storage():
        LOCAL_STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
        logger.info("Using local file storage: %s", LOCAL_STORAGE_ROOT)
        return

    settings = get_settings()
    client = _get_client()
    bucket = settings.minio_bucket
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            logger.info("Created MinIO bucket: %s", bucket)
    except S3Error as exc:
        logger.warning("MinIO bucket check failed: %s", exc)


def upload_bytes(object_key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
    if uses_local_storage():
        path = _hashed_local_path(object_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        legacy = _legacy_local_path(object_key)
        if legacy != path:
            legacy.parent.mkdir(parents=True, exist_ok=True)
            legacy.write_bytes(data)
        return

    settings = get_settings()
    client = _get_client()
    client.put_object(
        settings.minio_bucket,
        object_key,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )


def download_bytes(object_key: str) -> bytes:
    if uses_local_storage():
        return _read_local_object(object_key)

    settings = get_settings()
    client = _get_client()
    response = client.get_object(settings.minio_bucket, object_key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def delete_object(object_key: str) -> None:
    if uses_local_storage():
        for path in (_hashed_local_path(object_key), _legacy_local_path(object_key)):
            if path.is_file():
                path.unlink()
        return

    settings = get_settings()
    client = _get_client()
    client.remove_object(settings.minio_bucket, object_key)
