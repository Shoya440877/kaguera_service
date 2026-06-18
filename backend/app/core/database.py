"""Database engine, session factory, declarative base, and the request-scoped session dependency."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# pool_pre_ping recovers gracefully from connections dropped by the DB
# (e.g. when the Postgres container restarts during development).
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models (SQLAlchemy 2.0 style)."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yield a session and guarantee it is closed afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
