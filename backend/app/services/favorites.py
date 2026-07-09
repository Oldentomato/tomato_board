from datetime import datetime, timezone
from uuid import uuid4
from urllib.parse import urlparse

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.favorite import FavoriteModel
from app.schemas import CreateFavoriteInput, Favorite, FavoritesResponse


def _format_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _to_favorite(row: FavoriteModel) -> Favorite:
    return Favorite(
        id=row.id,
        name=row.name,
        url=row.url,
        sortOrder=row.sort_order,
        createdAt=_format_utc(row.created_at),
        updatedAt=_format_utc(row.updated_at),
    )


def _normalize_url(raw: str) -> str:
    url = raw.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required.")
    if not url.lower().startswith(("http://", "https://")):
        url = f"https://{url}"
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid URL.")
    return url


def list_favorites(db: Session, user_id: str) -> FavoritesResponse:
    rows = db.scalars(
        select(FavoriteModel)
        .where(FavoriteModel.user_id == user_id)
        .order_by(FavoriteModel.sort_order.asc(), FavoriteModel.created_at.asc())
    ).all()
    return FavoritesResponse(favorites=[_to_favorite(row) for row in rows])


def create_favorite(db: Session, user_id: str, input_data: CreateFavoriteInput) -> Favorite:
    name = input_data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")
    url = _normalize_url(input_data.url)

    duplicated = db.scalar(
        select(FavoriteModel).where(
            FavoriteModel.user_id == user_id,
            FavoriteModel.url == url,
        )
    )
    if duplicated:
        raise HTTPException(status_code=409, detail="Favorite already exists.")

    sort_order = (
        db.query(FavoriteModel).where(FavoriteModel.user_id == user_id).count()
    )
    now = FavoriteModel.utcnow()
    row = FavoriteModel(
        id=str(uuid4()),
        user_id=user_id,
        name=name,
        url=url,
        sort_order=sort_order,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_favorite(row)


def delete_favorite(db: Session, user_id: str, favorite_id: str) -> None:
    row = db.scalar(
        select(FavoriteModel).where(
            FavoriteModel.id == favorite_id,
            FavoriteModel.user_id == user_id,
        )
    )
    if not row:
        raise HTTPException(status_code=404, detail="Favorite not found.")
    db.delete(row)
    db.commit()
