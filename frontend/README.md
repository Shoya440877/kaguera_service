# kaguera — フロントエンド (Next.js)

一人暮らし向けの家具・家電 EC + AR 試し置き + AI コーディネート Web アプリ **kaguera** のフロントエンド。

> 本アプリは大学のチーム開発で取り組んだ課題を、**個人学習目的で再設計・再実装**したものです。

---

## 主な機能

- **トップ**: ヒーロー + 商品一覧（カテゴリ / サブカテゴリでフィルタ）
- **商品詳細**: サイズ・スタイル・評価を表示。QR を出して実機で AR 起動
- **マイページ**: 好み診断 → 間取り画像を AI 解析 → 「AIおまかせで配置」→ 2D / 3D 部屋ビューにドラッグ配置（回転・削除）
- **カート**
- **AR**: Android = WebXR / iOS = AR Quick Look に出し分け
- **【新】レイアウト保存・共有**: 配置を保存して `public_id` を発番 → QR / URL で共有 → 別端末で復元

## 技術スタック

- Next.js 14（App Router）/ React 18 / TypeScript（strict）
- Tailwind CSS（`app/globals.css` のデザイントークン + `kaguera-*` クラス）
- lucide-react（アイコン）/ qrcode.react（QR）/ `@anthropic-ai/sdk`（API ルートから Claude 呼び出し）
- デプロイ想定: Vercel

## セットアップ

```bash
cd frontend
npm install
cp .env.example .env.local     # 値は任意（未設定でもフォールバックで動作）
npm run dev                    # http://localhost:3000
npm run build                  # 本番ビルド（型チェック込み）
npm run lint                   # ESLint (next/core-web-vitals)
```

> Node は `.node-version`（20）を想定。

## 環境変数（`.env.local`）

| 変数 | 例 / 既定 | 説明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | （空） | Claude 連携。**未設定でもフォールバックで動作** |
| `JINA_API_KEY` | （空） | 寸法スクレイピング補助。未設定でも直接 fetch にフォールバック |
| `NEXT_PUBLIC_LAYOUT_API_BASE` | `http://localhost:8000` | レイアウト保存・共有 API（`../backend`）のベース URL |

`.env*` は git 管理外（`.env.example` のみコミット）。

## レイアウト保存・共有（バックエンド連携）

保存・共有機能は FastAPI バックエンド（`../backend`）が必要です。

```bash
# リポジトリ直下
docker compose up -d           # api:8000 + db(Postgres)
```

マイページで配置 →「保存して共有」→ QR / URL → `/layouts/{publicId}` で復元。
**バックエンド未起動時はエラー表示のみで UI は壊れません。**

## AI フロー（フォールバック設計）

`/api/analyze-room`（間取り解析）/ `/api/recommend`（レコメンド）は Claude（`claude-sonnet-4-6`）を呼びますが、
**API キーが無い / 失敗しても必ずローカルロジックにフォールバック**し、UI が壊れないことを要件としています。

## AR（試し置き）

- Android は **WebXR**（`public/ar.html`、Three.js + Hit Test + AABB 衝突判定）。
- iOS は **AR Quick Look**（`.usdz`）。
- **Android Chrome（ARCore 対応端末）推奨**。iOS Safari は WebXR 非対応です。

## 既知の制約

- 商品画像は Unsplash 直リンク（ポートフォリオ用途）。読み込み失敗時は背景色 + 絵文字にフォールバック。
- AR の衝突判定は軸並行 Bounding Box による近似。回転配置では判定が甘くなる場合があります。

## クレジット

大学のチーム開発で制作したアプリを、個人で再設計・再実装したものです。 &copy; 2026 KAGUERA
