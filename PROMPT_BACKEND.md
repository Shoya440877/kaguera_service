# Claude Code 実装プロンプト — kaguera バックエンド（レイアウト保存・共有 API）

あなたは Python / FastAPI / PostgreSQL に習熟したシニアバックエンドエンジニアです。
「kaguera」フロントエンドの新機能「**部屋レイアウトの保存・共有**」を支える REST API を
ゼロから実装します。このドキュメントが唯一の正とする仕様書です。
品質・型安全・テスト・運用しやすさを重視し、ポートフォリオとして提示できる水準に仕上げてください。

> このサービスはバックエンドエンジニア志望の作者の主力アピールです。
> 「設計意図を説明できるコード」を目指してください。過度な抽象化は不要ですが、
> 層（API / service / model / schema）の責務分離は明確にすること。

---

## 0. 厳守する作業ルール

- **コードを書く前に設計を宣言する**。各ステップの冒頭で「これから作るファイルと責務」を 2〜4 行で述べる。
- **型ヒント必須**。すべての関数に型注釈。`mypy` を通す前提で書く（厳密すぎる場合は理由を述べて緩める）。
- **SQLAlchemy は 2.0 スタイル**（`Mapped` / `mapped_column` / `select()`）。レガシー Query API を使わない。
- **Pydantic は v2**（`BaseModel` / `model_config` / `ConfigDict`）。
- **小さく刻む**。1 ステップ = 1 ファイル群。各ステップ後に「何を・なぜ」を 1〜3 行で報告。
- **テストを後回しにしない**。API を実装したら必ず対応するテストを書く。
- **秘密情報をコミットしない**。`.env` は `.gitignore`。`.env.example` のみ作る。
- **エラーは握りつぶさない**。意味のある HTTP ステータスと JSON エラーボディを返す。
- 例外時のスタックトレースをそのままレスポンスに出さない（情報漏洩防止）。

---

## 1. 何を作るか（スコープ）

フロントで配置した部屋レイアウト（家具の種類・サイズ・座標の配列）を受け取り、
**短い public_id を発番して永続化**し、その id で誰でも閲覧・復元できる API。

### エンドポイント一覧
| メソッド | パス | 説明 | ステータス |
|---|---|---|---|
| POST   | `/api/layouts`              | レイアウト作成。public_id を発番して返す | 201 |
| GET    | `/api/layouts/{public_id}`  | 取得。`view_count` を +1 する | 200 / 404 |
| DELETE | `/api/layouts/{public_id}`  | 削除（任意・実装する） | 204 / 404 |
| GET    | `/health`                   | ヘルスチェック | 200 |

> 一覧 GET `/api/layouts` は個人情報・スパム懸念があるため**実装しない**（公開列挙しない）。

### 非機能要件
- CORS: フロント（`http://localhost:3000` と本番 Vercel ドメイン）からのアクセスを許可。
- バリデーション: items 最大 50 件、座標は部屋範囲に丸める、文字列長制限。
- 観測性: 構造化ログ（リクエスト ID 付きが望ましい）。最低限 `logging` を設定。
- 冪等な起動: コンテナ再起動でテーブルが無ければ作成（学習用途は `create_all`、
  本番志向にするなら Alembic マイグレーションを用意。**どちらにするか宣言して進める**）。

---

## 2. 技術スタック / バージョン

- Python 3.12
- FastAPI（最新安定）/ Uvicorn
- SQLAlchemy 2.x / psycopg 3（`postgresql+psycopg://`）
- Pydantic v2 / pydantic-settings
- PostgreSQL 16
- pytest / httpx（TestClient）/ （任意）pytest-asyncio
- Docker / docker-compose
- 開発補助: ruff（lint/format）, mypy（型）

---

## 3. ディレクトリ構成（このとおり）

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI アプリ生成・CORS・ルーター登録・/health・起動処理
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # pydantic-settings（DB URL / CORS / id 長など）
│   │   └── database.py         # engine / SessionLocal / Base / get_db 依存
│   ├── models/
│   │   ├── __init__.py
│   │   └── layout.py           # SQLAlchemy モデル Layout
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── layout.py           # Pydantic: LayoutItem / LayoutCreate / LayoutRead
│   ├── services/
│   │   ├── __init__.py
│   │   └── layout.py           # ビジネスロジック（public_id 発番 / CRUD / バリデーション）
│   └── api/
│       ├── __init__.py
│       └── layouts.py          # APIRouter（エンドポイント定義）
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # テスト用 DB（SQLite in-memory or テスト用 Postgres）と client fixture
│   └── test_layouts.py
├── Dockerfile
├── requirements.txt            # or pyproject.toml（poetry/uv 可。選んだ理由を述べる）
├── .env.example
├── .gitignore
├── ruff.toml（任意）
└── README.md
```

---

## 4. データモデル仕様

### `models/layout.py` — Layout（テーブル: `layouts`）
| カラム | 型 | 制約 / 既定 | 説明 |
|---|---|---|---|
| id | int | PK, autoincrement | 内部 ID |
| public_id | str(16) | unique, index, not null | URL 共有用の短い ID |
| title | str(120) | default `'無題のレイアウト'` | 表示名 |
| room_width_cm | int | nullable | 部屋幅 |
| room_depth_cm | int | nullable | 部屋奥行 |
| items | JSONB | not null, default `[]` | 配置アイテム配列（下記 JSON） |
| view_count | int | not null, default 0 | 閲覧数 |
| created_at | datetime(tz) | default now(UTC) | 作成時刻 |
| updated_at | datetime(tz) | default now, onupdate now | 更新時刻 |

`items` の各要素（JSON）:
```json
{
  "productId": "bed-001",
  "x": 10.0, "y": 20.0,
  "rotation": 0,
  "w_cm": 100, "d_cm": 200, "h_cm": 40
}
```
> productId だけでなく寸法も保存することで、共有相手が同じ商品マスタを持たなくても
> 部屋ビューを復元できる（堅牢性のための意図的な非正規化）。

---

## 5. スキーマ仕様（`schemas/layout.py`・Pydantic v2）

```python
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Literal

class LayoutItem(BaseModel):
    productId: str = Field(min_length=1, max_length=64)
    x: float = Field(ge=0, le=2000)
    y: float = Field(ge=0, le=2000)
    rotation: Literal[0, 90] = 0
    w_cm: float = Field(gt=0, le=500)
    d_cm: float = Field(gt=0, le=500)
    h_cm: float = Field(gt=0, le=500)

class LayoutCreate(BaseModel):
    title: str | None = Field(default=None, max_length=120)
    room_width_cm: int | None = Field(default=None, ge=1, le=2000)
    room_depth_cm: int | None = Field(default=None, ge=1, le=2000)
    items: list[LayoutItem] = Field(min_length=0, max_length=50)

class LayoutRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    public_id: str
    title: str
    room_width_cm: int | None
    room_depth_cm: int | None
    items: list[LayoutItem]
    view_count: int
    created_at: datetime
```
- items は最大 50 件（`max_length=50`）。超過は 422。
- 値域は上記でガード。範囲外は 422。

---

## 6. サービス層仕様（`services/layout.py`）

責務: DB セッションを受け取り、ビジネスロジックを実行する純粋な関数群。
API 層は薄く、ロジックはここに集約する。

実装する関数:
```python
def generate_public_id(db: Session, length: int) -> str:
    """secrets.token_urlsafe ベースで衝突しない public_id を発番。
    生成 → 既存チェック → 衝突時は再生成（最大 N 回, それでも駄目なら例外）。"""

def create_layout(db: Session, payload: LayoutCreate, id_length: int) -> Layout:
    """public_id を発番し、items を dict 化して保存。title 未指定はデフォルト。
    items の座標は room_*_cm が指定されていれば範囲内に丸める（任意の堅牢化）。"""

def get_layout_by_public_id(db: Session, public_id: str) -> Layout | None:
    """select() で 1 件取得。"""

def increment_view_count(db: Session, layout: Layout) -> Layout:
    """view_count を +1 して commit。"""

def delete_layout(db: Session, public_id: str) -> bool:
    """存在すれば削除して True、無ければ False。"""
```
注意:
- public_id 発番は衝突確率が低くても必ずユニークチェックを入れる。
- 例外設計: 発番が N 回失敗したら `RuntimeError` 等を投げ、API 層で 500 に変換。
- service 層は FastAPI に依存しない（テスト容易性のため `HTTPException` を投げない）。

---

## 7. API 層仕様（`api/layouts.py`）

`APIRouter(prefix="/api/layouts", tags=["layouts"])` を作り、`main.py` で include。

```python
@router.post("", response_model=LayoutRead, status_code=201)
def create(payload: LayoutCreate, db: Session = Depends(get_db)) -> LayoutRead:
    layout = service.create_layout(db, payload, settings.layout_id_length)
    return LayoutRead.model_validate(layout)

@router.get("/{public_id}", response_model=LayoutRead)
def read(public_id: str, db: Session = Depends(get_db)) -> LayoutRead:
    layout = service.get_layout_by_public_id(db, public_id)
    if layout is None:
        raise HTTPException(status_code=404, detail="layout not found")
    layout = service.increment_view_count(db, layout)
    return LayoutRead.model_validate(layout)

@router.delete("/{public_id}", status_code=204)
def remove(public_id: str, db: Session = Depends(get_db)) -> None:
    ok = service.delete_layout(db, public_id)
    if not ok:
        raise HTTPException(status_code=404, detail="layout not found")
```
- 例外は `HTTPException` で表現し、レスポンスボディは `{"detail": "..."}` 形式（FastAPI 既定）。
- POST のレスポンスに必ず `public_id` を含める（フロントが共有 URL を組み立てる）。

---

## 8. 設定・DB・main（`core/` と `main.py`）

### `core/config.py`（pydantic-settings）
```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_name: str = "Kaguera Layout API"
    database_url: str = "postgresql+psycopg://kaguera:kaguera@db:5432/kaguera"
    cors_origins: str = "http://localhost:3000"
    layout_id_length: int = 8

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]
```

### `core/database.py`
- `create_engine(settings.database_url, pool_pre_ping=True)`
- `SessionLocal`、`Base = declarative_base()`、`get_db()` ジェネレータ依存。

### `main.py`
- `FastAPI(title=settings.app_name)`。
- CORS ミドルウェア（`allow_origins=settings.cors_origin_list`,
  `allow_methods=["*"], allow_headers=["*"]`）。
- 起動時にテーブル作成（`Base.metadata.create_all(bind=engine)`）か Alembic か宣言。
- `app.include_router(layouts.router)`。
- `GET /health` → `{"status": "ok"}`。
- ロギング設定（`logging.basicConfig`、INFO）。

---

## 9. テスト仕様（`tests/`）

`conftest.py`:
- テスト用 DB を用意する。**推奨**: SQLite in-memory（`StaticPool`）で高速に。
  ただし JSONB は Postgres 専用なので、モデルの JSON カラムは
  「Postgres では JSONB、その他では JSON」になるよう `JSON().with_variant(JSONB, "postgresql")`
  を使う（これで SQLite テストと Postgres 本番を両立）。**この方針を採用すること**。
- `get_db` を override したテスト用 `TestClient` fixture を提供。
- 各テストで DB をクリーンにする（テーブル作成→破棄 or トランザクションロールバック）。

`test_layouts.py`（最低限・網羅的に）:
1. `test_health` … `/health` が 200。
2. `test_create_layout_returns_public_id` … POST 201、`public_id` が 8 文字前後、items が往復一致。
3. `test_create_with_default_title` … title 省略時にデフォルト名が入る。
4. `test_get_layout_increments_view_count` … GET の度に view_count が増える。
5. `test_get_not_found` … 未知 id で 404。
6. `test_delete_layout` … 作成→削除 204→再取得 404。
7. `test_items_max_50` … items 51 件で 422。
8. `test_item_value_out_of_range` … w_cm=0 や rotation=45 で 422。
9. `test_public_id_uniqueness` … 複数作成して public_id が一意。

`pytest` がグリーンであることを完了条件とする。

---

## 10. Docker / 実行

### `backend/Dockerfile`
```dockerfile
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### ルート `docker-compose.yml`
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: kaguera
      POSTGRES_PASSWORD: kaguera
      POSTGRES_DB: kaguera
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kaguera"]
      interval: 5s
      timeout: 5s
      retries: 5
  api:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+psycopg://kaguera:kaguera@db:5432/kaguera
      CORS_ORIGINS: http://localhost:3000
    ports: ["8000:8000"]
    depends_on:
      db:
        condition: service_healthy
volumes:
  pgdata:
```

### `.env.example`
```
DATABASE_URL=postgresql+psycopg://kaguera:kaguera@db:5432/kaguera
CORS_ORIGINS=http://localhost:3000
LAYOUT_ID_LENGTH=8
```

検証手順:
```bash
docker compose up --build        # api: http://localhost:8000  docs: /docs
curl localhost:8000/health
# POST 例
curl -X POST localhost:8000/api/layouts -H 'Content-Type: application/json' \
  -d '{"title":"テスト","room_width_cm":255,"room_depth_cm":340,
       "items":[{"productId":"bed-001","x":10,"y":20,"rotation":0,
                 "w_cm":100,"d_cm":200,"h_cm":40}]}'
# 返ってきた public_id で GET
curl localhost:8000/api/layouts/<public_id>
```

---

## 11. README（バックエンド章）に書くこと

- この API の役割（レイアウト保存・共有）と全体アーキテクチャ図。
- 層構成（api / service / model / schema）の責務と設計意図。
- public_id 設計（なぜ連番でなく token_urlsafe か = 推測されにくい共有 URL）。
- items に寸法を持たせた理由（商品マスタ非依存の復元）。
- JSON/JSONB の variant 戦略（テストは SQLite、本番は Postgres）。
- 起動方法（docker compose）/ エンドポイント表 / テスト実行方法。
- 今後の拡張余地（認証付きマイレイアウト一覧、Alembic 移行、レート制限など）。

---

## 12. 完了の定義（Definition of Done）

- [ ] `docker compose up --build` で api と db が起動し `/health` が 200。
- [ ] `/docs`（Swagger UI）で 3 エンドポイントが表示・試行できる。
- [ ] POST→GET→DELETE の往復が仕様どおり動作。
- [ ] バリデーション（items>50、値域外、rotation≠0/90）が 422 を返す。
- [ ] `pytest` 全てグリーン（§9 の 9 ケース以上）。
- [ ] `ruff check` / `mypy app`（採用したなら）がクリーン、または逸脱理由を明記。
- [ ] `.env` がコミットされていない。`.env.example` がある。
- [ ] README（バックエンド章）が整備済み。

各ステップ完了ごとに「作ったファイル・設計意図・テスト結果」を簡潔に報告すること。
仕様の矛盾や判断が必要な点（Alembic 採用可否など）は、勝手に決めず宣言・確認してから進めること。
