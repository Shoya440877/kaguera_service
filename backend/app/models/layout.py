"""SQLAlchemy model for a saved, shareable room layout."""

from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

DEFAULT_TITLE = "無題のレイアウト"

# JSONB on PostgreSQL (typed, indexable); plain JSON elsewhere so the
# SQLite-based test suite works without a Postgres-only column type.
JSON_VARIANT = JSON().with_variant(JSONB(), "postgresql")


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Layout(Base):
    """A persisted room layout, addressable by a short shareable ``public_id``."""

    __tablename__ = "layouts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    public_id: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(120), default=DEFAULT_TITLE)
    room_width_cm: Mapped[int | None] = mapped_column(Integer)
    room_depth_cm: Mapped[int | None] = mapped_column(Integer)
    # Non-normalised on purpose: each item carries its own dimensions so a
    # layout can be restored even if the viewer lacks the product master.
    items: Mapped[list[dict]] = mapped_column(JSON_VARIANT, default=list)
    view_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
