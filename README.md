# kaguera（カグエラ）

一人暮らし向けの **家具・家電 EC + AR 試し置き + AI コーディネート** Web アプリ。
間取り画像をアップロードすると AI が部屋を解析し、好み診断と合わせて家具・家電を提案。
気になった商品は **AR で実空間に試し置き**でき、配置した部屋レイアウトは
**短い URL / QR で保存・共有**して別の端末から復元できます。

---

## 🔗 デモ

| 対象 | URL |
|---|---|
| フロントエンド（Vercel） | **https://kaguera.vercel.app** |
| バックエンド API（Render） | https://kaguera-api-29wx.onrender.com/docs （Swagger UI） |

**動作環境メモ**

- **AR 機能は Android Chrome（ARCore 対応端末）推奨**。iOS は AR Quick Look に出し分けますが、iOS Safari は WebXR 非対応です。
- **初回アクセスは起動に 50 秒ほどかかることがあります。** バックエンドが Render の無料プランで、15 分アクセスがないとスリープするためです。
  これは運用費を**月 0 円**に抑えるための意図的な選択で、常時起動が必要になれば有料プラン（$7/月）へ切り替えるだけで解消します。
  2 回目以降は通常どおり応答します。

---

## 主な機能

- **トップ / 商品一覧** — ヒーロー + カテゴリ・サブカテゴリでのフィルタ（家具・家電 58 件）
- **商品詳細** — サイズ・スタイル・評価を表示。QR から実機で AR を起動
- **マイページ（AI コーディネート）** — 好み診断 → 間取り画像を AI が解析 → 「AI おまかせ配置」→ 2D / 3D 部屋ビューにドラッグ配置（回転・削除）
- **AR 試し置き** — Android = WebXR / iOS = AR Quick Look の出し分け
- **レイアウト保存・共有** — 配置を保存して `public_id` を発番 → QR / URL で共有 → 別端末で復元
- カート / お気に入り / 簡易チェックアウト

---

## アーキテクチャ

```
        ブラウザ（PC / スマホ）
              │
              ▼
 ┌─────────────────────────────────────┐        ┌──────────────────┐
 │  Next.js 14（Vercel）                │ HTTPS  │  Anthropic Claude │
 │  ・App Router ページ / UI            │ ─────▶ │  claude-sonnet-4-6│
 │  ・API Routes（サーバ側）            │ ◀───── │  （間取り解析 /   │
 │     /api/analyze-room  間取り解析    │  JSON  │    レコメンド）    │
 │     /api/recommend     レコメンド    │        └──────────────────┘
 │     /api/fetch-dimensions 寸法抽出   │   ※ いずれも失敗時はローカル
 └─────────────────────────────────────┘     ロジックへフォールバック
              │ レイアウト保存・共有（HTTP/JSON）
              ▼
 ┌─────────────────────────────────────┐
 │  FastAPI（Render / Docker）          │   層を責務分離
 │   api → service → model / schema     │   （API / service / model / schema）
 │              │                       │
 │              ▼                       │
 │   PostgreSQL 18（JSONB）             │   レイアウトを永続化
 └─────────────────────────────────────┘
```

- **フロントの API Routes は「Claude を呼ぶサーバ層」**として動作し、`ANTHROPIC_API_KEY` が無い／呼び出しに失敗した場合も**必ずローカルロジックにフォールバック**して UI が壊れないことを要件にしています。
- **レイアウト保存・共有は独立した FastAPI バックエンド**が担い、Vercel フロントから HTTP/JSON で呼びます。

---

## 技術スタック

| 領域 | 採用技術 |
|---|---|
| フロントエンド | Next.js 14（App Router）/ React 18 / TypeScript（strict）/ Tailwind CSS |
| UI 補助 | lucide-react（アイコン）/ qrcode.react（QR）/ `@anthropic-ai/sdk` |
| AR | **Three.js `0.160.0`**（生の WebXR Device API + Hit Test API を実装、独自の AABB 衝突判定）/ **Google `<model-viewer>`**（`.glb` / `.usdz` 表示、Android Scene Viewer・WebXR と iOS Quick Look の出し分け）※いずれも CDN（unpkg）読み込みで npm 依存には含めていない |
| AI | Anthropic Claude（`claude-sonnet-4-6`）— マルチモーダル入力 → JSON 構造化出力 |
| バックエンド | FastAPI / Python 3.12 / Uvicorn |
| DB / ORM | PostgreSQL（本番 Neon 18 / ローカル 16）/ SQLAlchemy 2.0（`Mapped`・`select()`）/ psycopg 3 / Pydantic v2 |
| テスト・品質 | pytest（FastAPI TestClient）/ ruff / mypy |
| インフラ | Docker / docker-compose / Vercel（フロント）/ Render（API・Docker）/ Neon（マネージド PostgreSQL） |

---

## 設計・実装で工夫した点（見どころ）

ポートフォリオとして特に説明できるようにしている箇所です。

### バックエンド（レイアウト保存・共有 API）— 主力アピール

- **層の責務分離**：`api`（HTTP のみ）→ `service`（ビジネスロジック）→ `model` / `schema`。
  service 層は **FastAPI に依存させず**素の例外を投げる設計にし、DB セッションだけで単体テストできるようにしています。
- **`public_id` は `secrets.token_urlsafe` 由来（連番にしない）**：id 自体が「共有の鍵」になるため、連番だと他人のレイアウトを総当たりで覗けてしまう。推測困難なトークンを採用し、発番ごとに一意チェック＋衝突時リトライ。
- **`items` に寸法（w/d/h）を意図的に非正規化**：共有相手が同じ商品マスタを持たなくても**マスタ非依存でレイアウトを復元**できる。
- **JSON / JSONB の variant 戦略**：本番 Postgres では JSONB、テストでは SQLite の JSON にフォールバック。これにより **CI は軽量な SQLite in-memory** で完結します。
- 詳細は [backend/README.md](backend/README.md)。

### フロントエンド / AI

- **Claude のマルチモーダル入力 → JSON 構造化出力 + フォールバック設計**：間取り画像を解析し構造化 JSON を得る。キー無し・失敗時もローカルロジックで必ず動く。
- **寸法スクレイピングの抽出優先順**：JSON-LD → 日本語パターン → W×D×H の順で寸法を抽出。
- **AR 実装は 2 系統**：
  - 商品詳細ページ（[`ArViewer.tsx`](frontend/components/ArViewer.tsx)）は Google `<model-viewer>` を採用。`.glb`/`.usdz` を渡すだけで Android Scene Viewer・WebXR・iOS Quick Look の出し分けを任せられる。
  - 部屋レイアウトの試し置きデモ（[`public/ar.html`](frontend/public/ar.html)）は Three.js で **生の WebXR Device API + Hit Test API** を直接実装。床の平面性チェックと配置済み家具との **AABB 衝突判定**を自前で組み、置けない場所は赤いリングで即座に示す。
  - AR.js（マーカー型AR）は不使用。iOS は WebXR 非対応のため AR Quick Look（`.usdz`）に自動フォールバック。
- 詳細は [frontend/README.md](frontend/README.md)。

---

## リポジトリ構成

```
kaguera_service/
├── frontend/                  # Next.js 14（App Router）— Vercel デプロイ
│   ├── app/
│   │   ├── page.tsx           # トップ（商品一覧 + ヒーロー）
│   │   ├── products/[id]/     # 商品詳細
│   │   ├── mypage/            # AI コーディネート（診断・解析・配置）
│   │   ├── layouts/[publicId]/# 共有レイアウト復元ページ
│   │   ├── ar/[id]/           # AR リダイレクト
│   │   ├── cart/ favorites/ checkout/
│   │   └── api/               # サーバ側 Route Handlers（Claude 連携・スクレイピング）
│   │       ├── analyze-room/  recommend/  fetch-dimensions/
│   ├── components/            # Header/Footer, RoomView2D/3D, mypage/* など
│   ├── lib/                   # products, kaguera(配置/レコメンド), layoutApi ほか
│   └── public/               # ar.html / ios.html / models（.glb, .usdz）
│
├── backend/                   # FastAPI — Render デプロイ
│   └── app/
│       ├── api/layouts.py     # ルーティング・HTTP 関心のみ
│       ├── services/layout.py # 発番・CRUD・座標クランプ（FastAPI 非依存）
│       ├── models/layout.py   # SQLAlchemy 2.0 モデル
│       ├── schemas/layout.py  # Pydantic v2 入出力契約
│       └── core/              # 設定（pydantic-settings）/ DB セッション
│
├── docker-compose.yml         # api + db（Postgres 16）をローカルで一括起動
├── render.yaml                # Render Blueprint（API のみ／DB は Neon）
├── DEPLOY.md                  # 本番デプロイ手順（Neon → Render → Vercel）
├── KAGUERA_BUILD_SPEC.md      # 設計書
├── BACKEND.md / FRONTEND.md   # 実装プロンプト（設計意図のメモ）
└── README.md                  # このファイル
```

---

## ローカルでの起動

### 1. フロントエンドのみ（最短）

AI 連携・保存共有は未設定でもフォールバックで動くため、まずはこれだけで一通り触れます。

```bash
cd frontend
npm install
cp .env.example .env.local      # 値は任意（未設定でもOK）
npm run dev                     # http://localhost:3000
```

### 2. バックエンド込み（保存・共有機能まで）

リポジトリ直下で Docker Compose を起動すると、API（:8000）と PostgreSQL が立ち上がります。

```bash
docker compose up --build       # API: http://localhost:8000  /  Swagger UI: /docs
curl localhost:8000/health      # {"status":"ok"}
```

フロント側の `frontend/.env.local` で接続先を指定します。

```
NEXT_PUBLIC_LAYOUT_API_BASE=http://localhost:8000
```

> 各サブプロジェクトの詳細な手順・環境変数・設計解説は [frontend/README.md](frontend/README.md) と [backend/README.md](backend/README.md) を参照してください。

---

## テスト・品質

```bash
# バックエンド（backend/）
pytest            # 9 passed（SQLite in-memory で Postgres 不要）
ruff check app tests
mypy app          # クリーン

# フロントエンド（frontend/）
npm run build     # next build（型チェック込み）
npm run lint      # ESLint（next/core-web-vitals）
```

---

## 既知の制約

- 商品画像は Unsplash の直リンク（ポートフォリオ・非商用用途）。読み込み失敗時は背景色 + 絵文字にフォールバックします。
- AR の衝突判定は軸並行 Bounding Box による近似で、回転配置では判定が甘くなる場合があります。
- 保存・共有 API のスキーマ管理は起動時 `create_all`（学習用途のため Alembic は不採用。本番運用なら Alembic 導入が次のステップ）。
- インフラは全て無料枠（Vercel Hobby / Render Free / Neon Free）で構成し、運用費は**月 0 円**。
  トレードオフとして API のコールドスタート（前述）を受け入れています。

---

## 出自とクレジット

大学のチーム開発で制作したアプリのコンセプトを土台に、**個人で再設計・再実装**したものです。
商品データ・文章・コードは本リポジトリ向けに作り直しています。

&copy; 2026 KAGUERA
