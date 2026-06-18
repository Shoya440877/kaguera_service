"""HTTP layer for layouts: thin handlers that delegate to the service layer."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.layout import LayoutCreate, LayoutRead
from app.services import layout as service

router = APIRouter(prefix="/api/layouts", tags=["layouts"])

# Reusable request-scoped DB session dependency (Annotated form avoids B008).
DbSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=LayoutRead, status_code=201)
def create_layout(payload: LayoutCreate, db: DbSession) -> LayoutRead:
    try:
        layout = service.create_layout(db, payload, settings.layout_id_length)
    except RuntimeError as exc:
        # Don't leak internals; the only expected RuntimeError is id exhaustion.
        raise HTTPException(status_code=500, detail="could not allocate a public id") from exc
    return LayoutRead.model_validate(layout)


@router.get("/{public_id}", response_model=LayoutRead)
def read_layout(public_id: str, db: DbSession) -> LayoutRead:
    layout = service.get_layout_by_public_id(db, public_id)
    if layout is None:
        raise HTTPException(status_code=404, detail="layout not found")
    layout = service.increment_view_count(db, layout)
    return LayoutRead.model_validate(layout)


@router.delete("/{public_id}", status_code=204)
def delete_layout(public_id: str, db: DbSession) -> None:
    deleted = service.delete_layout(db, public_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="layout not found")
