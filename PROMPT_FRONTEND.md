# Claude Code 実装プロンプト — kaguera フロントエンド

あなたは Next.js / TypeScript に習熟したシニアフロントエンドエンジニアです。
これから「kaguera（カグエラ）」という一人暮らし向けの家具・家電 AR コーディネート Web アプリの
**フロントエンドを完成**させます。このドキュメントが唯一の正とする仕様書です。
不明点は憶測で埋めず、まずこのドキュメントと既存コードを確認し、根拠を述べてから実装してください。

---

## 0. 厳守する作業ルール

- **コードを書く前に必ず全体を読む**。`lib/`・`components/`・`app/` の既存ファイルを `tree` と
  read で把握してから着手する。依存関係（特に `lib/products.ts` への依存）を壊さない。
- **型安全を最優先**。`any` を使わない。`npm run build`（= `next build`、型チェック込み）が
  通らないコードは「未完成」とみなす。各ステップ完了時に必ず `npm run build` を実行する。
- **勝手に仕様を足さない / 削らない**。仕様外の機能追加や既存機能の削除をする場合は、
  理由を述べて確認を取る。
- **変更は小さく刻む**。1 ステップ = 1 つの論理的なまとまり。ステップごとに、何をなぜ変えたかを
  1〜3 行で報告する。
- **既存のデザイントークンを使う**。色やスタイルをハードコードで増やさず、`globals.css` の
  CSS 変数（`--accent` 等）と `kaguera-*` クラス、`tailwind.config.ts` の `brand/beige/wood/sand`
  を使う。新色を足すときは tailwind config に追加してから使う。
- **秘密情報をコミットしない**。`.env*` は `.gitignore` 済みであることを確認し、
  `.env.example` のみ作る。
- 日本語 UI。文言は既存のトーン（やわらかい・一人暮らし向け）に合わせる。

---

## 1. プロダクト概要（何を作るか）

一人暮らし向けの家具・家電 EC + AR 試し置き + AI コーディネートアプリ。

ユーザー体験の流れ:
1. **トップ** … ヒーロー + 商品一覧（カテゴリ/サブカテゴリでフィルタ）。
2. **商品詳細** … サイズ・スタイル・評価を表示。QR を出して実機で AR 起動。
3. **マイページ** … (a) 好み診断（mood / budget / priority）→ (b) 間取り画像アップロードで
   AI が部屋を解析 → (c) その結果をもとに AI が家具家電セットをレコメンドし、
   2D/3D の部屋ビューに配置。配置はドラッグで動かせる。
4. **カート** … 選んだ商品を確認。
5. **AR** … Android は WebXR（`ar.html`）、iOS は AR Quick Look（`ios.html` / usdz）に出し分け。
6. **【新機能】レイアウト保存・共有** … 配置した部屋レイアウトを保存して
   public_id を発番し、QR / URL で共有。別端末で復元できる。

AI 連携（Claude）は Next.js の API ルートから `@anthropic-ai/sdk` で呼ぶ。
**API キーが無い / 失敗した場合は必ずフォールバックして UI が壊れないこと**が要件。

---

## 2. 技術スタック / 制約

- Next.js 14 App Router / React 18 / TypeScript（strict）
- Tailwind CSS（`globals.css` にトークンと `kaguera-*` コンポーネントクラス）
- アイコン: lucide-react / QR: qrcode.react / AI: @anthropic-ai/sdk
- 画像: next/image。`imageUrl` は Unsplash 直リンク（ポートフォリオなので許容）。
  `next.config.mjs` の `images.remotePatterns` に `images.unsplash.com` を許可すること。
- Node 20.x / デプロイ: Vercel
- パスエイリアス `@/*` → プロジェクトルート（`tsconfig.json` 既定）

---

## 3. ディレクトリ構成（このとおりに配置）

```
frontend/
├── app/
│   ├── layout.tsx                      # 既存: Provider + Header/Footer/AuthModal
│   ├── page.tsx                        # 既存: ヒーロー + <HomeClient products={products} />
│   ├── globals.css                     # 既存: デザイントークン
│   ├── products/[id]/page.tsx          # 既存: 静的生成 + ProductDetailClient
│   ├── mypage/page.tsx                 # 既存: <MyPageClient />
│   ├── cart/page.tsx                   # 既存: カート
│   ├── ar/[id]/page.tsx                # 既存: buildArRedirectUrl で redirect
│   ├── layouts/[publicId]/page.tsx     # 【新規】共有レイアウト復元ページ
│   └── api/
│       ├── analyze-room/route.ts       # 既存: Claude 間取り解析（フォールバックあり）
│       ├── recommend/route.ts          # 既存: Claude レコメンド（フォールバックあり）
│       └── fetch-dimensions/route.ts   # 既存: 寸法スクレイピング（nitori 対応）
├── components/
│   ├── Header.tsx Footer.tsx AuthModal.tsx
│   ├── HomeClient.tsx ProductCard.tsx ProductDetailClient.tsx
│   ├── RoomView2D.tsx                  # 既存
│   ├── RoomView3D.tsx                  # 【要確認】無ければ §6 の仕様で新規実装
│   └── mypage/
│       ├── MyPageClient.tsx TasteQuiz.tsx RoomUpload.tsx
│       └── RoomPlannerSection.tsx      # 【要確認】無ければ §5 の仕様で新規実装
├── lib/
│   ├── products.ts                     # 既存: 型 + 商品 58 件 + ユーティリティ
│   ├── kaguera.ts                      # 既存: 配置/レコメンドロジック
│   ├── productAttributes.ts            # 既存: rating/texture/atmosphere 補完
│   ├── roomLayout.ts                   # 既存: 間取りデータ
│   ├── ar.ts anthropic.ts auth.tsx cart.tsx   # 既存
│   └── layoutApi.ts                    # 【新規】FastAPI 呼び出しクライアント
├── public/
│   ├── icon.png
│   ├── ar.html ios.html onboarding.html
│   └── models/  (chair/desk/lamp の .glb / .usdz)
├── next.config.mjs tailwind.config.ts tsconfig.json
├── postcss.config.mjs package.json vercel.json
└── .env.local（git 管理外） / .env.example
```

---

## 4. ステップ順タスク（この順で実装し、各ステップ後に build を通す）

### STEP 1: プロジェクト初期化と既存ファイル配置
1. `frontend/` で Next.js 14 + TS + Tailwind の構成を用意（既存の
   `package.json` / `tsconfig.json` / `tailwind.config.ts` / `next.config.mjs` /
   `postcss.config.mjs` / `vercel.json` を配置）。
2. 受領済みの既存ファイルをすべて所定の位置に配置する。
3. `next.config.mjs` に next/image 用の許可を追加:
   ```js
   const nextConfig = {
     images: {
       remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
     },
   };
   export default nextConfig;
   ```
4. `.gitignore` に `node_modules`, `.next`, `.env*`(except `.env.example`) を含める。
5. `.env.example` を作成:
   ```
   ANTHROPIC_API_KEY=
   JINA_API_KEY=
   NEXT_PUBLIC_LAYOUT_API_BASE=http://localhost:8000
   ```
6. `npm install` → `npm run build`。型エラーがあれば、原因（多くは未配置ファイル）を
   特定して解消する。**この段階で products.ts に依存する全ページがビルドできること**。

検証: `npm run build` 成功 / `npm run dev` でトップ・商品詳細・カートが表示される。

### STEP 2: クレジットと出自の整理（公開前提の必須対応）
1. `Footer.tsx` の `チームD：…（個人名4名）` の行を削除する。
   代わりに `&copy; 2026 KAGUERA` のみ、または
   「大学のチーム開発で制作したアプリを個人で再設計したものです」とする。
2. 後で書く README 用に、この変更点をメモしておく。

検証: フッターに個人名が残っていないこと。

### STEP 3: 既存 AI フロー（analyze-room / recommend）の健全性確認
1. `lib/anthropic.ts` の `getAnthropicClient()` が `ANTHROPIC_API_KEY` 未設定時に
   `null` を返し、各 route がフォールバックする経路を確認する。
2. `app/api/analyze-room/route.ts` と `recommend/route.ts` の `model` 文字列を、
   実装時点で有効な Claude モデル名に更新する（ハードコードされた日付付き旧モデル名があれば差し替え）。
   **モデル名は公式ドキュメントで確認**してから変更し、変更理由を報告する。
3. `RoomUpload.tsx` → `/api/analyze-room`、`RoomPlannerSection` → `/api/recommend` の
   リクエスト/レスポンス形が一致しているか確認する。

検証: APIキー未設定でも、間取りアップロードがフォールバック値（1K/6畳…）を返して
`status: 'done'` になり、UI が壊れない。

### STEP 4: RoomPlannerSection の実装（§5 参照）
### STEP 5: RoomView3D の実装（§6 参照）
### STEP 6: レイアウト保存・共有の接続（§7 参照）
### STEP 7: 仕上げ（§8 参照）

---

## 5. RoomPlannerSection.tsx の仕様（手元に無ければ新規実装）

役割: マイページの中核。好み診断結果(`TasteAnswers`)と部屋解析結果(`RoomProfile`)を受け取り、
AI レコメンド → 部屋ビュー配置 → 保存/共有までを束ねる。

Props:
```ts
type Props = {
  tasteAnswers: Partial<TasteAnswers>;   // lib/kaguera.ts
  roomProfile: RoomProfile | null;       // lib/kaguera.ts
};
```

状態と機能:
1. `placedItems: PlacedProduct[]`（`lib/kaguera.ts` の型）を保持。
2. **「AI におまかせ配置」ボタン**:
   - `/api/recommend` に `{ roomInfo: roomProfile, preferences: tasteAnswers, allProducts: products }`
     を POST。レスポンス `recommendedProductIds` を受け取る。
   - 失敗時は `buildFallbackRecommendationIds(products, tasteAnswers)` を使う（必ず結果が出る）。
   - 得た productId 群を初期配置に変換する。配置アルゴリズムは
     **グリッド状に重ならないよう自動レイアウト**する（下記）。
3. **自動レイアウト（重なり回避）**:
   - 各商品の footprint は `getFootprintSize(product, rotation)` で取得。
   - 部屋サイズ `ROOM_DIMENSIONS_CM`（255×340）に対し、左上から行優先で順に置く。
     行に収まらなければ次の行へ。各アイテムは `clampToRoom` で範囲内に丸める。
   - 簡易 AABB 判定（軸並行）で既配置と重なる場合は右 or 下にずらす。
     50 回試行して置けなければそのアイテムはスキップ（やりすぎない）。
   - `instanceId` は `crypto.randomUUID()`。`source: 'recommended'`。
4. **ビュー切替**: 2D（`RoomView2D`）/ 3D（`RoomView3D`）をタブで切替。
   `roomProfile` から間取り(`FIXED_FLOOR_PLAN`)を 2D に渡すか、シンプル 6 畳かを選べるようにする。
5. **ドラッグ移動**: `RoomView2D` の `onMoveItem(itemId, x, y)` を受け、`clampToRoom` で丸めて state 更新。
6. **アイテム操作**: 選択中アイテムを 90°回転 / 削除できる小さな操作バーを出す。
7. **「保存して共有」ボタン**: §7 のフローを呼ぶ。
8. **レコメンド理由**: `getRecommendationReason(subCategory, tasteAnswers)` で各アイテムの
   採用理由を一覧表示する（説明性の演出）。

UI: `kaguera-card` 内に「① おまかせ配置」「② 部屋ビュー（2D/3D 切替）」「③ 保存・共有」を
縦に並べる。ローディングは lucide-react の `Loader2` を `animate-spin` で。
空状態（未配置）は「AI におまかせ配置を実行してください」と促す。

エラーハンドリング: recommend API が落ちてもフォールバックで必ず配置が出る。
ネットワーク例外は握りつぶさず、控えめなトースト/インラインメッセージで通知。

### RoomPlannerSection 受け入れ基準
- API キーの有無に関わらず「おまかせ配置」で 7〜10 点が重ならず配置される。
- ドラッグで動かせ、範囲外に出ない。回転・削除が効く。
- 2D/3D を切り替えても配置状態が保持される。

---

## 6. RoomView3D.tsx の仕様（手元に無ければ新規実装）

役割: `PlacedProduct[]` を 3D で俯瞰表示する読みやすいビュー。`RoomView2D` と同じ Props を受ける。

Props（2D と揃える）:
```ts
type Props = {
  items: PlacedProduct[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
  onMoveItem: (itemId: string, x: number, y: number) => void;
  floorPlan?: FloorPlanArea[] | null;
};
```

実装方針:
- ライブラリは **three**（既存 AR が Three.js 前提）。`three` を依存に追加してよい。
  ただし重い依存（react-three-fiber 等）の新規導入は避け、素の three で実装する。
- カメラは斜め俯瞰（45°程度）の固定 or 軽いオービット。OrbitControls が使えない環境を考慮し、
  自前のドラッグ回転（任意）か固定視点で可。
- 部屋は 255×340cm を床平面（PlaneGeometry）で表現し、壁を簡易表示。
- 各 `PlacedProduct` は `getProductById` で寸法を取り、`BoxGeometry`(w×h×d) で表現。
  色は `product.color`。選択中は emissive かワイヤフレームでハイライト。
- 上から見た X-Z 平面の座標を 2D の (x, y) と対応させる（cm→メートル換算 = /100）。
- クリックでアイテム選択（`onSelectItem`）。3D でのドラッグ移動は任意（難しければ
  選択のみ対応で可。移動は 2D で行う前提でよい）。
- `requestAnimationFrame` ループは unmount で必ず破棄。リサイズ対応。WebGL 未対応時は
  「3D 表示に対応していません」とフォールバック表示。

### RoomView3D 受け入れ基準
- items が 3D の箱として正しいサイズ比・位置で表示される。
- 2D ↔ 3D 切替でクラッシュしない。メモリリーク（ループ未破棄）が無い。

---

## 7. レイアウト保存・共有（新機能・フロント側）

### 7-1. `lib/layoutApi.ts`（新規）
```ts
const BASE = process.env.NEXT_PUBLIC_LAYOUT_API_BASE ?? 'http://localhost:8000';

export type LayoutItemDTO = {
  productId: string;
  x: number; y: number;
  rotation: 0 | 90;
  w_cm: number; d_cm: number; h_cm: number;
};

export type SaveLayoutPayload = {
  title?: string;
  room_width_cm?: number;
  room_depth_cm?: number;
  items: LayoutItemDTO[];
};

export type LoadedLayout = {
  public_id: string;
  title: string;
  room_width_cm: number | null;
  room_depth_cm: number | null;
  items: LayoutItemDTO[];
  view_count: number;
  created_at: string;
};

export async function saveLayout(payload: SaveLayoutPayload): Promise<{ publicId: string }> {
  const res = await fetch(`${BASE}/api/layouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
  const data = await res.json();
  return { publicId: data.public_id };
}

export async function loadLayout(publicId: string): Promise<LoadedLayout> {
  const res = await fetch(`${BASE}/api/layouts/${publicId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`not found: ${res.status}`);
  return res.json();
}
```
`PlacedProduct` → `LayoutItemDTO` 変換ヘルパも用意（productId と寸法を `getProductById` から補完）。

### 7-2. RoomPlannerSection に「保存して共有」を追加
- 現在の `placedItems` を `SaveLayoutPayload` に変換 → `saveLayout` → `publicId` 取得。
- 共有 URL = `${window.location.origin}/layouts/${publicId}`。
- `qrcode.react` の `QRCodeSVG` で QR を出すモーダルを表示（`ProductDetailClient` の
  QR モーダルと同じ作法でよい）。URL コピー用ボタンも置く。
- API がまだ無い/落ちている場合は「共有サーバーに接続できません」と明示し、UI は壊さない。

### 7-3. `app/layouts/[publicId]/page.tsx`（新規・復元ページ）
- サーバーコンポーネントで `loadLayout(publicId)` を試み、404 は `notFound()`。
- 取得した items を `RoomView2D`（読み取り専用＝ドラッグ無効）で表示。
- 「自分のマイページでこの配置を編集する」導線を置く（state 渡しは query or sessionStorage 経由で可）。
- メタデータ（title）を反映。

### 保存・共有 受け入れ基準
- 配置 → 保存 → QR/URL 取得 → 別タブで `/layouts/{publicId}` を開くと同じ配置が再現される。
- バックエンド未起動でもフロントがクラッシュしない（明確なエラー表示に留まる）。

---

## 8. 仕上げ（最終ステップ）

1. **アクセシビリティ**: 主要ボタンに `aria-label`、QR モーダルは Esc で閉じる、フォーカストラップ。
2. **レスポンシブ**: スマホ幅（375px）で崩れないこと。商品グリッド・部屋ビュー・モーダルを確認。
3. **空/エラー状態**: 一覧 0 件、カート空、AI 失敗、保存失敗の各表示が親切であること。
4. **パフォーマンス**: next/image の sizes 指定、不要な re-render（配置ドラッグ中）を抑制。
5. **型チェック/Lint**: `npm run build` と `npm run lint` がクリーン。
6. **README.md**（フロント章）:
   - アプリ概要 / スクショ / 出自（チーム開発を個人で再設計）/ 起動手順 /
     環境変数 / 既知の制約（iOS は Quick Look、AR は Android Chrome 必須）。
7. **最終確認**: トップ→商品→QR表示、マイページ→診断→（画像）→おまかせ配置→2D/3D→保存→共有復元、
   の一連がエラーなく通ることを手動で確認し、結果を報告する。

---

## 9. 完了の定義（Definition of Done）

- [ ] `npm run build` / `npm run lint` がエラー 0。
- [ ] トップ・商品詳細・カート・マイページ・共有ページが SP/PC で破綻なく表示。
- [ ] AI フロー（解析・レコメンド）が **APIキー無しでもフォールバックで動作**。
- [ ] おまかせ配置が重なりなく配置され、ドラッグ/回転/削除が機能。
- [ ] 2D/3D 切替が安定動作（リーク無し）。
- [ ] 保存→QR/URL→別端末復元が成立。
- [ ] Footer に個人名が残っていない。`.env` がコミットされていない。
- [ ] README が整備済み。

各ステップ完了ごとに「変更点・理由・build 結果」を簡潔に報告すること。
不明点や仕様の矛盾を見つけたら、勝手に決めず必ず質問すること。
