from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.database import get_db
from app.dependencies import require_user
from app.schemas import CreateMemoInput, Memo, MemoPositionInput, MemosResponse, UpdateMemoInput, User
from app.services import memos as memo_service

router = APIRouter(prefix="/memos", tags=["memos"])


@router.get("", response_model=MemosResponse)
async def list_memos(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(memo_service.list_memos, db, user.id)


@router.post("", response_model=Memo, status_code=201)
async def create_memo(
    body: CreateMemoInput,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(memo_service.create_memo, db, user.id, body)


@router.put("/{memo_id}", response_model=Memo)
async def update_memo(
    memo_id: str,
    body: UpdateMemoInput,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(memo_service.update_memo, db, user.id, memo_id, body)


@router.patch("/{memo_id}/position", response_model=Memo)
async def move_memo(
    memo_id: str,
    body: MemoPositionInput,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return await run_in_threadpool(
        memo_service.move_memo,
        db,
        user.id,
        memo_id,
        body.side,
        body.index,
    )


@router.delete("/{memo_id}")
async def delete_memo(
    memo_id: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    await run_in_threadpool(memo_service.delete_memo, db, user.id, memo_id)
    return Response(status_code=204)
