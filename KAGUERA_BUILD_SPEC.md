# kaguera 設計書


## 1. プロジェクト概要

### コンセプト
一人暮らし向けの家具・家電 EC + AR 試し置き + AI コーディネート。
間取り画像をアップロードすると AI が部屋を解析し、好み診断と合わせて
家具・家電セットを提案。商品は AR（Android: WebXR / iOS: Quick Look）で
実空間に置いて確認できる。

### 主要な見どころ（ポートフォリオとしての売り）
- **AI 連携**: Claude にマルチモーダル（間取り画像）入力 → JSON 構造化出力 → フォールバック設計
- **スコアリング・レコメンドロジック**（`lib/kaguera.ts`）
- **スクレイピング/寸法抽出**（JSON-LD → 日本語パターン → W×D×H の優先順）
- **AR 出し分け**（WebXR / Quick Look）
- **【新機能】レイアウト保存・共有 API（FastAPI + PostgreSQL + Docker）** ← 自分の得意領域

---

## 2. 技術スタック

### フロントエンド（元構成を踏襲）
- Next.js 14（App Router）/ React 18 / TypeScript
- Tailwind CSS（`globals.css` にデザイントークンとカスタムコンポーネントクラス）
- lucide-react（アイコン）, qrcode.react（QR）
- `@anthropic-ai/sdk`（Next.js の API ルートから Claude を呼ぶ）
- デプロイ: Vercel

### バックエンド（新規・自分の得意領域）
- FastAPI / Python 3.12
- PostgreSQL / SQLAlchemy 2.x
- Docker / docker-compose
- デプロイ想定: Render / Fly.io / Railway いずれか（無料枠）

---

## 3. ディレクトリ構成（目標）

```
kaguera/
├── frontend/                      # Next.js（元プロジェクト相当）
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # トップ（商品一覧 + ヒーロー）
│   │   ├── globals.css
│   │   ├── products/[id]/page.tsx # 商品詳細
│   │   ├── mypage/page.tsx        # マイページ
│   │   ├── cart/page.tsx          # カート
│   │   ├── ar/[id]/page.tsx       # AR redirect
│   │   ├── layouts/[publicId]/page.tsx   # 【新】共有レイアウト復元ページ
│   │   └── api/
│   │       ├── analyze-room/route.ts     # Claude: 間取り解析
│   │       ├── recommend/route.ts        # Claude: レコメンド
│   │       └── fetch-dimensions/route.ts # 寸法スクレイピング
│   ├── components/
│   │   ├── Header.tsx  Footer.tsx  AuthModal.tsx
│   │   ├── HomeClient.tsx  ProductCard.tsx  ProductDetailClient.tsx
│   │   ├── RoomView2D.tsx  RoomView3D.tsx
│   │   └── mypage/
│   │       ├── MyPageClient.tsx  TasteQuiz.tsx  RoomUpload.tsx
│   │       └── RoomPlannerSection.tsx
│   ├── lib/
│   │   ├── products.ts            # ★要新規作成（型 + 商品データ）
│   │   ├── kaguera.ts             # 配置・レコメンドロジック
│   │   ├── productAttributes.ts   # 質感/評価の補完
│   │   ├── roomLayout.ts          # 間取りデータ
│   │   ├── ar.ts  anthropic.ts  auth.tsx  cart.tsx
│   │   └── layoutApi.ts           # 【新】FastAPI 呼び出しクライアント
│   ├── public/
│   │   ├── icon.png
│   │   ├── ar.html  ios.html  onboarding.html
│   │   └── models/ (*.glb, *.usdz)
│   └── (next.config.mjs, tailwind.config.ts, tsconfig.json, package.json ...)
│
├── backend/                       # 【新】FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── core/      config.py  database.py
│   │   ├── models/    layout.py
│   │   ├── schemas/   layout.py
│   │   ├── services/  layout.py
│   │   └── api/       layouts.py
│   ├── tests/         test_layouts.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── docker-compose.yml             # api + db（+ 任意で frontend）
└── README.md
```

---

## 4. ステップ1: フロントエンドの復元

元のファイル群はほぼそのまま使える。AIには以下を順に依頼する。

### 4-1. `lib/products.ts`（実物あり・型一致確認済み）
他の全ファイルが依存する土台。**実物が手元にある**（58 件・型は下記）。
受領済みのものをそのまま配置すればよい。新規作成は不要。

型定義（実物どおり）:
```ts
export type Category = 'furniture' | 'appliance';

export type SubCategory =
  | 'sofa' | 'bed' | 'desk' | 'chair' | 'dining_table' | 'shelf' | 'wardrobe' | 'tv_stand'
  | 'refrigerator' | 'tv' | 'microwave' | 'washing_machine'
  | 'air_conditioner' | 'vacuum' | 'rice_cooker' | 'kettle';

export type Style = 'modern' | 'natural' | 'minimal' | 'cozy' | 'industrial';

export type Product = {
  id: string;                 // "{subCategory}-{連番}" 例 "bed-001"
  name: string;
  category: Category;
  subCategory: SubCategory;
  price: number;              // 税込・円
  condition: 'new' | 'used';
  shopName: string;
  size: { width: number; depth: number; height: number };  // cm
  color: string;              // HEX
  imageUrl: string;           // Unsplash URL
  icon: string;               // 上から見た絵文字
  description: string;
  style: Style[];
  essentialForSingle: boolean;
  rating?: number;            // productAttributes.enrichProduct で補完
  texture?: string;
  atmosphere?: string;
};

export const products: Product[] = [ /* 58 件 */ ];

// 実物には以下のユーティリティも含まれる
export function filterByCategory(category: Category): Product[];
export function filterBySubCategory(sub: SubCategory): Product[];
export function filterByStyle(style: Style): Product[];
export function getEssentials(): Product[];
export function getProductById(id: string): Product | undefined;
export function countBySubCategory(): Record<SubCategory, number>;
```

商品データについてのメモ:
- 全 58 件、new : used ≒ 7 : 3。各サブカテゴリに複数点あり、レコメンドが
  サブカテゴリ単位で選んでも候補が枯れない。
- 商品名・説明文・店名（KAGUERA ストア等）はオリジナル創作なのでそのまま使用可。
- **画像は Unsplash の直リンク URL**。今回はポートフォリオ（非商用）なのでそのまま使用する方針。
  - `ProductCard` / `ProductDetailClient` は画像読み込み失敗時に背景色 + 絵文字へ
    フォールバックする作りなので、URL が切れても表示は崩れない。
  - 将来 本番公開する場合のみ Unsplash API 経由 + クレジット表記、または自前アセットへ
    差し替えを検討する（ポートフォリオ段階では不要）。
- `next.config.mjs` の `images` 設定に `images.unsplash.com` の remotePatterns が
  必要（next/image を使うため）。元設定に含まれているか確認し、無ければ追加する。

### 4-2. 残りのファイルを配置
元のコードをベースに以下を配置（中身は受領済みのものを使う）。
- コンポーネント: Header, Footer, AuthModal, HomeClient, ProductCard, ProductDetailClient, RoomView2D
- mypage: MyPageClient, TasteQuiz, RoomUpload
- lib: kaguera, productAttributes, roomLayout, ar, anthropic, auth, cart
- app: layout, page, products/[id], mypage, cart, ar/[id]
- api: analyze-room, recommend, fetch-dimensions
- public: icon.png, ar.html, ios.html, onboarding.html, models/*

### 4-3. まだ中身が無いファイル（再取得 or 再生成が必要）
- `RoomPlannerSection.tsx`（レコメンド + 2D/3D 配置の統合。`/api/recommend` を叩き、
  `RoomView2D` / `RoomView3D` に `PlacedProduct[]` を渡す。`kaguera.ts` の
  `buildFallbackRecommendationIds` / `clampToRoom` を利用）
  → 元ファイルが手元にあれば貼る。無ければ仕様から再実装する。
- `RoomView3D.tsx`（3D 表示。元ファイルがあれば貼る。無ければ
  Three.js で `PlacedProduct[]` を簡易ボックス表示する形で再実装可）

> `lib/products.ts` は実物受領済み（58 件・型一致確認済み）。新規作成不要。

### 4-4. 動作確認
```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # 静的生成 + 型チェックが通ることを確認
```
`generateStaticParams` が products に依存するので、products.ts が正しければ
商品詳細ページがビルド時に静的生成される。

---

## 5. ステップ2【新機能】: レイアウト保存・共有 API（FastAPI）

配置したレイアウト（家具の種類・サイズ・座標）を保存し、
**短い public_id を発番 → QR / URL で共有 → 別端末で復元**する。
qrcode.react は既に依存にあるので QR 生成はフロントで完結できる。

### 5-1. データモデル（`backend/app/models/layout.py`）
```
Layout
  id            int  PK
  public_id     str  unique, index    # 例 "a1b2c3d4"（URL 共有用）
  title         str                   # "無題のレイアウト" デフォルト
  room_width_cm int  nullable
  room_depth_cm int  nullable
  items         JSONB                 # PlacedItem[]（下記）
  view_count    int  default 0
  created_at    datetime
  updated_at    datetime
```

`items` に入れる JSON（フロントの `PlacedProduct` と対応させる）:
```json
[
  { "productId": "bed-001", "x": 10.0, "y": 20.0, "rotation": 0,
    "w_cm": 100, "d_cm": 200, "h_cm": 40 }
]
```
> 注: 共有相手が同じ商品マスタを持たない可能性に備え、
> productId だけでなく寸法（w/d/h）も保存しておくと復元の堅牢性が上がる。

### 5-2. API エンドポイント（`backend/app/api/layouts.py`）
| メソッド | パス | 説明 | 区分 |
|---|---|---|---|
| POST | `/api/layouts` | レイアウト作成。body を受け取り public_id を発番して返す | 作成 |
| GET  | `/api/layouts/{public_id}` | レイアウト取得（view_count++） | 取得 |
| GET  | `/api/layouts` | （任意）一覧。ポートフォリオでは省略可 | 一覧 |
| DELETE | `/api/layouts/{public_id}` | （任意）削除 | 削除 |

リクエスト/レスポンス例（POST）:
```jsonc
// Request
{
  "title": "6畳の配置案",
  "room_width_cm": 255,
  "room_depth_cm": 340,
  "items": [ { "productId": "bed-001", "x": 10, "y": 20, "rotation": 0,
               "w_cm": 100, "d_cm": 200, "h_cm": 40 } ]
}
// Response 201
{ "public_id": "a1b2c3d4", "title": "6畳の配置案", "items": [...],
  "view_count": 0, "created_at": "..." }
```

### 5-3. public_id 生成（`backend/app/services/layout.py`）
- `secrets.token_urlsafe` ベースで 8 文字程度。衝突したら採番し直す（ループ）。
- バリデーション: items は最大 50 件、各座標は 0〜部屋寸法の範囲内に丸める。

### 5-4. スキーマ（`backend/app/schemas/layout.py`）
Pydantic v2 で `LayoutCreate` / `LayoutItem` / `LayoutRead` を定義。
- `LayoutItem`: productId, x, y, rotation(0|90), w_cm, d_cm, h_cm
- `LayoutCreate`: title?, room_width_cm?, room_depth_cm?, items[]
- `LayoutRead`: public_id, title, room_*; items, view_count, created_at

### 5-5. main.py
- FastAPI アプリ生成、CORS（`http://localhost:3000` と本番 Vercel ドメインを許可）
- 起動時に `Base.metadata.create_all`（
- ルーター登録、`/health` エンドポイント

### 5-6. Docker
`backend/Dockerfile`（python:3.12-slim, requirements インストール, uvicorn 起動）と、
ルートの `docker-compose.yml`:
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
  api:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+psycopg://kaguera:kaguera@db:5432/kaguera
      CORS_ORIGINS: http://localhost:3000
    ports: ["8000:8000"]
    depends_on: ["db"]
volumes:
  pgdata:
```

### 5-7. テスト
`backend/tests/test_layouts.py` を pytest + FastAPI TestClient で。
- POST → 201 と public_id 発番を確認
- 発番された public_id で GET → 同じ items が返り view_count が増える
- 存在しない public_id → 404
- items が 50 件超 → 422（バリデーション）

---

## 6. ステップ3: フロントとバックエンドの接続

### 6-1. `lib/layoutApi.ts`
```ts
const BASE = process.env.NEXT_PUBLIC_LAYOUT_API_BASE ?? 'http://localhost:8000';

export async function saveLayout(payload: SaveLayoutPayload): Promise<{ publicId: string }> {
  const res = await fetch(`${BASE}/api/layouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('save failed');
  const data = await res.json();
  return { publicId: data.public_id };
}

export async function loadLayout(publicId: string): Promise<LoadedLayout> {
  const res = await fetch(`${BASE}/api/layouts/${publicId}`);
  if (!res.ok) throw new Error('not found');
  return res.json();
}
```
`NEXT_PUBLIC_LAYOUT_API_BASE` は `.env.local` で設定。

### 6-2. RoomPlannerSection に「保存して共有」ボタンを追加
- 現在の `PlacedProduct[]` を `saveLayout` の形に変換して POST。
- 返ってきた `publicId` で共有 URL を作り、`QRCodeSVG` で QR を表示
  （ProductDetailClient の QR モーダルと同じ qrcode.react を流用）。
- 共有 URL: `${origin}/layouts/${publicId}`

### 6-3. `app/layouts/[publicId]/page.tsx`（新規・復元ページ）
- `loadLayout(publicId)` でレイアウトを取得し、`RoomView2D`（読み取り専用モード）で表示。
- 「自分のマイページで編集」導線を置くと回遊性が上がる。

---

## 7. 環境変数まとめ

`frontend/.env.local`
```
ANTHROPIC_API_KEY=sk-ant-...          # 無くてもフォールバックで動く
JINA_API_KEY=jina_...                 # 無くても直接 fetch にフォールバック
NEXT_PUBLIC_LAYOUT_API_BASE=http://localhost:8000
```
`backend/.env`
```
DATABASE_URL=postgresql+psycopg://kaguera:kaguera@db:5432/kaguera
CORS_ORIGINS=http://localhost:3000
```
いずれも `.env.example` だけをコミットし、実値はコミットしない。

---

## 8. README に書くと良いこと

1. **このアプリは何か**（一人暮らし向け AR 家具コーディネート）
2. **出自の明記**（チーム開発の課題を個人で再設計・再実装したもの）
3. **自分が設計/実装した部分**を明確に
   - 特に **FastAPI のレイアウト保存・共有 API（DB 設計・スキーマ・Docker・テスト）** は
     バックエンド志望のアピールとして前面に出す
4. **技術構成図**（フロント Next.js / API ルートで Claude 連携 / FastAPI + PostgreSQL）
5. **工夫した点**: Claude の JSON 構造化出力 + フォールバック設計、スクレイピングの抽出優先順、
   AR の WebXR/Quick Look 出し分け、public_id による共有設計
6. **デモ URL / スクリーンショット / 動作環境**（Android Chrome 必須など）

---


