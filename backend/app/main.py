"""FastAPI application: wiring, CORS, schema bootstrap, and health check."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import layouts
from app.core.config import settings
from app.core.database import Base, engine
from app.models import Layout  # noqa: F401  -- register model on Base.metadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Learning-scoped schema management (no Alembic): ensure tables on startup.
    # Done here rather than at import time so the test suite never touches Postgres.
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured (create_all)")
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(layouts.router)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
