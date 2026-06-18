"""Business logic for creating, reading, and deleting room layouts.

This layer is deliberately framework-agnostic: it takes a SQLAlchemy ``Session``
and raises plain Python exceptions (never ``HTTPException``), so it stays
unit-testable and the API layer owns all HTTP concerns.
"""

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.layout import DEFAULT_TITLE, Layout
from app.schemas.layout import LayoutCreate

# How many times to retry on a public_id collision before giving up.
MAX_ID_ATTEMPTS = 10


def generate_public_id(db: Session, length: int) -> str:
    """Return a URL-safe ``public_id`` of ``length`` chars not already in use.

    token_urlsafe is unguessable (unlike a sequential id), which matters because
    the id *is* the share capability. Collisions are astronomically unlikely but
    still checked, and retried up to ``MAX_ID_ATTEMPTS`` times.
    """
    for _ in range(MAX_ID_ATTEMPTS):
        candidate = secrets.token_urlsafe(length)[:length]
        already_used = db.execute(
            select(Layout.id).where(Layout.public_id == candidate)
        ).first()
        if already_used is None:
            return candidate
    raise RuntimeError("could not generate a unique public_id")


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


def create_layout(db: Session, payload: LayoutCreate, id_length: int) -> Layout:
    """Persist a new layout with a freshly minted ``public_id``.

    Item coordinates are clamped into the room bounds when room dimensions are
    given — a defensive measure so a malformed client can't store off-canvas
    positions that break the viewer.
    """
    items: list[dict] = []
    for item in payload.items:
        data = item.model_dump()
        if payload.room_width_cm is not None:
            data["x"] = _clamp(data["x"], 0, payload.room_width_cm)
        if payload.room_depth_cm is not None:
            data["y"] = _clamp(data["y"], 0, payload.room_depth_cm)
        items.append(data)

    layout = Layout(
        public_id=generate_public_id(db, id_length),
        title=payload.title or DEFAULT_TITLE,
        room_width_cm=payload.room_width_cm,
        room_depth_cm=payload.room_depth_cm,
        items=items,
    )
    db.add(layout)
    db.commit()
    db.refresh(layout)
    return layout


def get_layout_by_public_id(db: Session, public_id: str) -> Layout | None:
    """Fetch a single layout by its ``public_id``, or ``None`` if absent."""
    return db.execute(
        select(Layout).where(Layout.public_id == public_id)
    ).scalar_one_or_none()


def increment_view_count(db: Session, layout: Layout) -> Layout:
    """Increment and persist the layout's view counter."""
    layout.view_count += 1
    db.commit()
    db.refresh(layout)
    return layout


def delete_layout(db: Session, public_id: str) -> bool:
    """Delete a layout by ``public_id``. Return ``True`` if a row was removed."""
    layout = get_layout_by_public_id(db, public_id)
    if layout is None:
        return False
    db.delete(layout)
    db.commit()
    return True
