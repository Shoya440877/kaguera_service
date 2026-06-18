# Claude Code 実装プロンプトの使い方

kaguera を Claude Code で実装するためのプロンプトです。フロントとバックで 2 枚に分かれています。

## ファイル
- `PROMPT_FRONTEND.md` … Next.js フロントエンドの完成用
- `PROMPT_BACKEND.md` … FastAPI レイアウト保存・共有 API の新規実装用
- `KAGUERA_REBUILD_SPEC.md` … 全体設計書（前段で作成済み。背景資料として一緒に置く）

## 進め方（おすすめ順）

1. **リポジトリを用意**
   - GitHub で新規リポジトリを作成し、ローカルにクローン。
   - ルートに `KAGUERA_REBUILD_SPEC.md` を置く。
   - 受領済みの既存ソース（products.ts 等）を `frontend/` 以下に配置しておく。

2. **バックエンドから着手するのがおすすめ**
   - 理由: あなたの得意領域で、フロントの「保存・共有」接続より先に API が在ると検証が楽。
   - Claude Code を `backend/` 起点（or ルート）で起動し、最初のメッセージに
     `PROMPT_BACKEND.md` の全文を貼る。冒頭に一言添える:
     > 「このプロンプトに従って backend を実装してください。§4 のステップ順で、
     >  各ステップ後に build/テスト結果を報告してください。Alembic 採用可否は §1 の方針に従い、
     >  まず宣言してから進めてください。」
   - `docker compose up --build` と `pytest` が通るまで見届ける。

3. **次にフロントエンド**
   - Claude Code を `frontend/` 起点で起動し、`PROMPT_FRONTEND.md` の全文を貼る。冒頭に:
     > 「このプロンプトに従って frontend を完成させてください。STEP 1 から順に、
     >  各ステップ後に `npm run build` の結果を報告してください。
     >  RoomPlannerSection / RoomView3D が手元に無い場合は §5 / §6 の仕様で新規実装してください。」
   - STEP 6（保存・共有）の接続時に、2 で作った API（`http://localhost:8000`）を起動しておく。

4. **疎通確認**
   - backend を起動した状態で、frontend のマイページ →おまかせ配置 →保存 →QR/URL →
     別タブで `/layouts/{publicId}` を開いて復元できることを確認。

## コツ
- Claude Code には**一度に全部やらせず、ステップ単位で**進めさせると品質が安定する。
  プロンプト内で「各ステップ後に報告」を求めているので、その report を読んでから次へ。
- 途中で仕様を変えたくなったら、対応するプロンプト（.md）側を先に書き換えてから
  「更新した仕様に合わせて」と指示すると、ぶれない。
- `RoomPlannerSection.tsx` / `RoomView3D.tsx` の元コードが見つかったら、
  新規実装させる前に貼る方が早い。見つからなければ仕様から作らせて OK。
- モデル名（claude-sonnet-... 等）は実装時点の有効なものを公式ドキュメントで確認させること
  （プロンプトにその指示済み）。

## 環境変数（コミットしない）
- frontend `.env.local`: `ANTHROPIC_API_KEY`, `JINA_API_KEY`, `NEXT_PUBLIC_LAYOUT_API_BASE`
- backend `.env`: `DATABASE_URL`, `CORS_ORIGINS`, `LAYOUT_ID_LENGTH`
- いずれも `.env.example` だけをコミット。
