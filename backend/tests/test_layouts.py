"""End-to-end tests for the layout API (SQLite-backed, no Postgres needed)."""

from typing import Any

from fastapi import status
from fastapi.testclient import TestClient

from app.models.layout import DEFAULT_TITLE

SAMPLE_ITEM = {
    "productId": "bed-001",
    "x": 10,
    "y": 20,
    "rotation": 0,
    "w_cm": 100,
    "d_cm": 200,
    "h_cm": 40,
}


def _payload(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "title": "6畳の配置案",
        "room_width_cm": 255,
        "room_depth_cm": 340,
        "items": [SAMPLE_ITEM],
    }
    body.update(overrides)
    return body


def test_health(client: TestClient) -> None:
    res = client.get("/health")
    assert res.status_code == status.HTTP_200_OK
    assert res.json() == {"status": "ok"}


def test_create_layout_returns_public_id(client: TestClient) -> None:
    res = client.post("/api/layouts", json=_payload())
    assert res.status_code == status.HTTP_201_CREATED
    body = res.json()
    assert 1 <= len(body["public_id"]) <= 16
    assert body["view_count"] == 0
    # items round-trip (numeric ints compare equal to the validated floats)
    assert body["items"] == [SAMPLE_ITEM]


def test_create_with_default_title(client: TestClient) -> None:
    res = client.post("/api/layouts", json=_payload(title=None))
    assert res.status_code == status.HTTP_201_CREATED
    assert res.json()["title"] == DEFAULT_TITLE


def test_get_layout_increments_view_count(client: TestClient) -> None:
    public_id = client.post("/api/layouts", json=_payload()).json()["public_id"]
    first = client.get(f"/api/layouts/{public_id}")
    assert first.status_code == status.HTTP_200_OK
    assert first.json()["view_count"] == 1
    assert client.get(f"/api/layouts/{public_id}").json()["view_count"] == 2


def test_get_not_found(client: TestClient) -> None:
    assert client.get("/api/layouts/missing").status_code == status.HTTP_404_NOT_FOUND


def test_delete_layout(client: TestClient) -> None:
    public_id = client.post("/api/layouts", json=_payload()).json()["public_id"]
    assert client.delete(f"/api/layouts/{public_id}").status_code == status.HTTP_204_NO_CONTENT
    assert client.get(f"/api/layouts/{public_id}").status_code == status.HTTP_404_NOT_FOUND
    # deleting an already-gone layout is a 404
    assert client.delete(f"/api/layouts/{public_id}").status_code == status.HTTP_404_NOT_FOUND


def test_items_max_50(client: TestClient) -> None:
    res = client.post("/api/layouts", json=_payload(items=[SAMPLE_ITEM] * 51))
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_item_value_out_of_range(client: TestClient) -> None:
    bad_width = {**SAMPLE_ITEM, "w_cm": 0}
    assert (
        client.post("/api/layouts", json=_payload(items=[bad_width])).status_code
        == status.HTTP_422_UNPROCESSABLE_ENTITY
    )
    bad_rotation = {**SAMPLE_ITEM, "rotation": 45}
    assert (
        client.post("/api/layouts", json=_payload(items=[bad_rotation])).status_code
        == status.HTTP_422_UNPROCESSABLE_ENTITY
    )


def test_public_id_uniqueness(client: TestClient) -> None:
    ids = {
        client.post("/api/layouts", json=_payload(items=[])).json()["public_id"]
        for _ in range(15)
    }
    assert len(ids) == 15
