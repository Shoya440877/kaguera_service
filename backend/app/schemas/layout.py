"""Pydantic v2 schemas: request validation and response shaping for layouts."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LayoutItem(BaseModel):
    """A single placed product within a layout (mirrors the frontend DTO).

    Field names are kept exactly as the frontend sends them (``productId``,
    ``w_cm`` ...) so the JSON contract round-trips without remapping.
    """

    productId: str = Field(min_length=1, max_length=64)
    x: float = Field(ge=0, le=2000)
    y: float = Field(ge=0, le=2000)
    rotation: Literal[0, 90] = 0
    w_cm: float = Field(gt=0, le=500)
    d_cm: float = Field(gt=0, le=500)
    h_cm: float = Field(gt=0, le=500)


class LayoutCreate(BaseModel):
    """Request body for ``POST /api/layouts``."""

    title: str | None = Field(default=None, max_length=120)
    room_width_cm: int | None = Field(default=None, ge=1, le=2000)
    room_depth_cm: int | None = Field(default=None, ge=1, le=2000)
    items: list[LayoutItem] = Field(min_length=0, max_length=50)


class LayoutRead(BaseModel):
    """Response shape for a layout, validated directly from the ORM object."""

    model_config = ConfigDict(from_attributes=True)

    public_id: str
    title: str
    room_width_cm: int | None
    room_depth_cm: int | None
    items: list[LayoutItem]
    view_count: int
    created_at: datetime
