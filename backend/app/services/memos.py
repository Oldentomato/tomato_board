from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.memo import DEFAULT_MEMO_COLOR, DEFAULT_MEMO_SIDE, MemoModel
from app.schemas import CreateMemoInput, Memo, MemosResponse, UpdateMemoInput

VALID_SIDES = frozenset({"left", "right"})


def _format_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _to_memo(row: MemoModel) -> Memo:
    return Memo(
        id=row.id,
        content=row.content,
        color=row.color,
        side=row.side,
        sortOrder=row.sort_order,
        archived=bool(row.archived),
        createdAt=_format_utc(row.created_at),
        updatedAt=_format_utc(row.updated_at),
    )


def _side_rows(db: Session, user_id: str, side: str) -> list[MemoModel]:
    return list(
        db.scalars(
            select(MemoModel)
            .where(
                MemoModel.user_id == user_id,
                MemoModel.side == side,
                MemoModel.archived.is_(False),
            )
            .order_by(MemoModel.sort_order.asc(), MemoModel.created_at.asc())
        ).all()
    )


def _renumber_side(rows: list[MemoModel]) -> None:
    for index, row in enumerate(rows):
        row.sort_order = index


def _set_archived(db: Session, user_id: str, row: MemoModel, archived: bool) -> None:
    if archived:
        side = row.side
        row.archived = True
        db.flush()
        remaining = _side_rows(db, user_id, side)
        _renumber_side(remaining)
        return

    row.archived = False
    db.flush()
    others = [item for item in _side_rows(db, user_id, row.side) if item.id != row.id]
    others.insert(0, row)
    _renumber_side(others)


def list_memos(db: Session, user_id: str) -> MemosResponse:
    rows = db.scalars(
        select(MemoModel)
        .where(MemoModel.user_id == user_id)
        .order_by(MemoModel.side.asc(), MemoModel.sort_order.asc(), MemoModel.created_at.asc())
    ).all()
    return MemosResponse(memos=[_to_memo(row) for row in rows])


def create_memo(db: Session, user_id: str, input_data: CreateMemoInput) -> Memo:
    content = input_data.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content is required.")

    side = input_data.side if input_data.side in VALID_SIDES else DEFAULT_MEMO_SIDE
    side_rows = _side_rows(db, user_id, side)

    now = MemoModel.utcnow()
    row = MemoModel(
        id=str(uuid4()),
        user_id=user_id,
        content=content,
        color=input_data.color or DEFAULT_MEMO_COLOR,
        side=side,
        sort_order=0,
        archived=False,
        created_at=now,
        updated_at=now,
    )
    side_rows.insert(0, row)
    _renumber_side(side_rows)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_memo(row)


def update_memo(db: Session, user_id: str, memo_id: str, input_data: UpdateMemoInput) -> Memo:
    row = db.scalar(
        select(MemoModel).where(MemoModel.id == memo_id, MemoModel.user_id == user_id)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Memo not found.")

    if input_data.content is not None:
        content = input_data.content.strip()
        if not content:
            raise HTTPException(status_code=400, detail="Content is required.")
        row.content = content
    if input_data.color is not None:
        row.color = input_data.color
    if input_data.archived is not None and bool(input_data.archived) != bool(row.archived):
        _set_archived(db, user_id, row, input_data.archived)
    row.updated_at = MemoModel.utcnow()

    db.commit()
    db.refresh(row)
    return _to_memo(row)


def move_memo(db: Session, user_id: str, memo_id: str, side: str, index: int) -> Memo:
    if side not in VALID_SIDES:
        raise HTTPException(status_code=400, detail="Invalid side.")

    row = db.scalar(
        select(MemoModel).where(MemoModel.id == memo_id, MemoModel.user_id == user_id)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Memo not found.")

    old_side = row.side
    row.archived = False
    left_rows = _side_rows(db, user_id, "left")
    right_rows = _side_rows(db, user_id, "right")

    if old_side == "left":
        left_rows = [item for item in left_rows if item.id != memo_id]
    else:
        right_rows = [item for item in right_rows if item.id != memo_id]

    target_rows = left_rows if side == "left" else right_rows
    clamped_index = max(0, min(index, len(target_rows)))
    row.side = side
    target_rows.insert(clamped_index, row)

    _renumber_side(left_rows)
    _renumber_side(right_rows)
    row.updated_at = MemoModel.utcnow()

    db.commit()
    db.refresh(row)
    return _to_memo(row)


def delete_memo(db: Session, user_id: str, memo_id: str) -> None:
    row = db.scalar(
        select(MemoModel).where(MemoModel.id == memo_id, MemoModel.user_id == user_id)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Memo not found.")

    side = row.side
    db.delete(row)
    db.flush()

    remaining = _side_rows(db, user_id, side)
    _renumber_side(remaining)
    db.commit()
