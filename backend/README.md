# kaguera — レイアウト保存・共有 API (backend)

家具・家電 AR コーディネートアプリ **kaguera** のバックエンド。
ユーザーが配置した「部屋レイアウト（家具の種類・寸法・座標の配列）」を受け取り、
**推測されにくい短い `public_id` を発番して永続化**し、その id で誰でも閲覧・復元できる REST API です。

> このサービスはバックエンド志望の作者の主力アピールです。層（API / service / model / schema）の
> 責務を明確に分離し、「設計意図を説明できるコード」を目指しています。

---

## アーキテクチャ

```
 Next.js フロント                FastAPI (backend)
 ┌───────────────┐   HTTP/JSON   ┌──────────────────────────────────────────┐
 │ RoomPlanner   │ ───────────▶ │  api/layouts.py     ← HTTP のみ（薄い層）   │
 │  保存/共有     │              │        │ 依存注入(get_db) / 例外→HTTP変換     │
 │  QR・復元      │ ◀─────────── │        ▼                                    │
 └───────────────┘   201/200/   │  services/layout.py ← ビジネスロジック       │
                     404/204    │        │ 発番 / CRUD / 座標クランプ           │
                                │        ▼ (FastAPI 非依存)                    │
                                │  models/layout.py   ← SQLAlchemy 2.0 モデル  │
                                │        │ schemas/layout.py ← Pydantic v2 契約 │
                                │        ▼                                    │
                                │   PostgreSQL 16 (JSONB)                      │
                                └──────────────────────────────────────────┘
```

**層ごとの責務**

| 層 | ファイル | 責務 |
|---|---|---|
| API | `app/api/layouts.py` | ルーティングと HTTP 関心のみ。検証済み入力を受け、service を呼び、`RuntimeError`→500 等に変換。 |
| Service | `app/services/layout.py` | ビジネスロジック（`public_id` 発番・CRUD・座標クランプ）。**FastAPI に依存せず**素の例外を投げる → 単体テスト容易。 |
| Model | `app/models/layout.py` | `layouts` テーブル定義（SQLAlchemy 2.0 `Mapped`/`mapped_column`）。 |
| Schema | `app/schemas/layout.py` | 入出力の契約（Pydantic v2）。値域・件数バリデーション。 |
| Core | `app/core/{config,database}.py` | 設定（pydantic-settings）と engine / session / `get_db` 依存。 |

---

## 技術スタック

- **Python 3.12**（Docker イメージ） / FastAPI / Uvicorn
- **SQLAlchemy 2.0**（`Mapped` / `mapped_column` / `select()`）/ **psycopg 3**（`postgresql+psycopg://`）
- **Pydantic v2** / pydantic-settings
- **PostgreSQL 16**
- テスト: pytest / FastAPI TestClient（httpx）
- 開発補助: ruff（lint/format）/ mypy（型）
- Docker / docker-compose

---

## 起動（Docker Compose）

リポジトリ直下で:

```bash
docker compose up --build        # api: http://localhost:8000  /  Swagger UI: /docs
# 別ターミナルで
curl localhost:8000/health       # {"status":"ok"}
```

停止: `docker compose down`（`pgdata` を消す場合は `-v`）。

`docker-compose.yml` は `db`(postgres:16, healthcheck 付き) と `api`(build ./backend) を定義し、
api は **db が healthy になってから**起動します。テーブルは起動時（lifespan）に `create_all` で用意されます。

---

## エンドポイント

| メソッド | パス | 説明 | ステータス |
|---|---|---|---|
| POST | `/api/layouts` | レイアウト作成。`public_id` を発番して返す | 201 |
| GET | `/api/layouts/{public_id}` | 取得。`view_count` を +1 | 200 / 404 |
| DELETE | `/api/layouts/{public_id}` | 削除 | 204 / 404 |
| GET | `/health` | ヘルスチェック | 200 |

> 一覧 GET `/api/layouts` は個人情報・スパム懸念のため**意図的に実装しません**（公開列挙しない）。

### リクエスト/レスポンス例

```bash
curl -X POST localhost:8000/api/layouts -H 'Content-Type: application/json' -d '{
  "title": "6畳の配置案",
  "room_width_cm": 255,
  "room_depth_cm": 340,
  "items": [
    { "productId": "bed-001", "x": 10, "y": 20, "rotation": 0,
      "w_cm": 100, "d_cm": 200, "h_cm": 40 }
  ]
}'
# 201 →
# { "public_id": "a1b2c3d4", "title": "6畳の配置案", "room_width_cm": 255,
#   "room_depth_cm": 340, "items": [ ... ], "view_count": 0, "created_at": "..." }

curl localhost:8000/api/layouts/a1b2c3d4   # 取得（view_count++）
```

---

## データモデル（`layouts` テーブル）

| カラム | 型 | 制約/既定 |
|---|---|---|
| id | int | PK |
| public_id | varchar(16) | unique, index, not null |
| title | varchar(120) | 既定 `'無題のレイアウト'` |
| room_width_cm | int | nullable |
| room_depth_cm | int | nullable |
| items | JSONB / JSON | not null（下記 variant 戦略） |
| view_count | int | not null, 既定 0 |
| created_at / updated_at | timestamptz | 既定 now / onupdate now |

`items` の各要素:

```json
{ "productId": "bed-001", "x": 10.0, "y": 20.0, "rotation": 0,
  "w_cm": 100, "d_cm": 200, "h_cm": 40 }
```

---

## 設計上の工夫（説明できるポイント）

- **`public_id` は `secrets.token_urlsafe` 由来（連番ではない）**
  id 自体が「共有の鍵」になるため、連番だと他人のレイアウトを総当たりで覗けてしまう。
  推測困難な URL-safe トークンを採用し、発番ごとに DB で一意チェック＋衝突時リトライ（最大 10 回）。

- **`items` に寸法（w/d/h）を持たせる意図的な非正規化**
  `productId` だけだと、共有相手が同じ商品マスタを持たない場合に部屋ビューを復元できない。
  寸法を同梱することで**マスタ非依存で復元**でき、共有の堅牢性が上がる。

- **JSON / JSONB の variant 戦略**
  モデルは `JSON().with_variant(JSONB(), "postgresql")`。本番 Postgres では **JSONB**（型付き・索引可能）、
  テストでは **SQLite の JSON** にフォールバック。これにより**テストは軽量な SQLite in-memory**で完結し、
  Postgres を立てずに CI が回る。

- **スキーマ管理は `create_all`（Alembic は不採用）**
  テーブルは `layouts` 1つ・学習/ポートフォリオ用途のため、起動時 `create_all` で十分と判断。
  マイグレーション履歴が必要な本番運用では **Alembic 導入が次のステップ**（下記「今後の拡張」）。

- **`create_all` を import 時でなく lifespan（起動時）で実行**
  import 副作用で DB に触れないため、テストが本番 Postgres を一切触らず安全。

- **service 層を FastAPI 非依存に**
  `HTTPException` を投げず素の例外（発番枯渇は `RuntimeError`）。HTTP 変換は API 層に集約し、
  ロジックを DB セッションだけで単体テストできる。

- **依存を runtime / dev に分離**（`requirements.txt` / `requirements-dev.txt`）
  Docker イメージには runtime のみ入れて軽量化。pytest/ruff/mypy はローカル開発に隔離。

---

## テスト

```bash
# backend/ で（ローカルは venv = Python 3.13）
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt   # Windows
# .venv/bin/pip install -r requirements-dev.txt      # macOS/Linux
.venv/Scripts/pytest                                 # 9 passed
```

`tests/conftest.py` が **SQLite in-memory（StaticPool）** のテスト用 DB を用意し、`get_db` を上書き、
`TestClient` を提供します（テストごとに create/drop で独立）。`tests/test_layouts.py` の網羅ケース:

1. `/health` 200
2. 作成 201 と `public_id` 発番・items 往復
3. `title` 省略時のデフォルト名
4. GET 毎の `view_count` インクリメント
5. 未知 id で 404
6. 作成→削除 204→再取得 404
7. items 51 件で 422
8. `w_cm=0` / `rotation=45` で 422（値域）
9. 複数作成で `public_id` 一意

---

## ローカル開発（lint / 型）

```bash
.venv/Scripts/ruff check app tests     # lint
.venv/Scripts/mypy app                 # 型チェック
```

ルール: `ruff.toml`（line-length 100 / target py312 / E,F,I,B,UP）。`mypy app` はクリーン。

---

## 環境変数

`.env.example` を参照（実値は `.env` に置き、コミットしない）。

| 変数 | 既定 | 説明 |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://kaguera:kaguera@db:5432/kaguera` | 接続文字列 |
| `CORS_ORIGINS` | `http://localhost:3000` | カンマ区切りで許可オリジン |
| `LAYOUT_ID_LENGTH` | `8` | `public_id` の文字数 |

---

## 今後の拡張余地

- **Alembic** によるマイグレーション管理（本番志向）。
- 認証付き「マイレイアウト一覧」（現状は公開列挙しない方針）。
- レート制限・構造化ログ（リクエスト ID）・メトリクス。
- 楽観ロックや `updated_at` を使った編集競合制御。
