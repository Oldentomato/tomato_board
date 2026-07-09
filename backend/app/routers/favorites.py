from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.database import get_db
from app.dependencies import require_user
from app.schemas import CreateFavoriteInput, Favorite, FavoritesResponse, User
from app.services import favorites as favorite_service

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=FavoritesResponse)
async def list_favorites(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(favorite_service.list_favorites, db, user.id)


@router.post("", response_model=Favorite, status_code=201)
async def create_favorite(
    body: CreateFavoriteInput,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(favorite_service.create_favorite, db, user.id, body)


@router.delete("/{favorite_id}")
async def delete_favorite(
    favorite_id: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    await run_in_threadpool(favorite_service.delete_favorite, db, user.id, favorite_id)
    return Response(status_code=204)
