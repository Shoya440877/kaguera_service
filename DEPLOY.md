# デプロイ手順（無料構成）

KAGUERA を **月額 0 円** で公開するための手順。上から順に実行する。

| レイヤー | サービス | 無料枠の制約 |
| --- | --- | --- |
| フロントエンド (Next.js) | Vercel Hobby | 商用利用不可 |
| API (FastAPI) | Render Free | 15 分無アクセスでスリープ（復帰に約 50 秒） |
| データベース (PostgreSQL) | Neon Free | 0.5 GB / アイドル時はゼロにスケール（復帰は 1 秒未満） |

リージョンは **すべて Singapore** に揃える。API から DB への問い合わせは 1 リクエストで複数回発生するため、
「利用者との距離」より「API と DB の距離」の方が体感速度に効く。

---

## STEP 1. Neon — データベースを作る

1. https://neon.tech に GitHub でサインイン
2. Project name: `kaguera` / Region: **AWS Asia Pacific 1 (Singapore)** → **Create project**
3. 表示された **Connection string**（`postgresql://...` で始まる）をコピーして控える
   - 「Pooled connection」の選択肢が出た場合、どちらでもよい（本構成は常駐サーバーなので直結で問題ない）

> このキーはチャットや GitHub に貼らない。次の STEP 2 の入力欄に直接貼る。

---

## STEP 2. Render — API を公開する

1. https://render.com に GitHub でサインイン
2. **New → Blueprint** → リポジトリ `Shoya440877/kaguera_service` を選択
   - Render がリポジトリ直下の `render.yaml` を読み込む
3. 環境変数の入力を求められるので、次の 2 つを入力する

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | STEP 1 でコピーした Neon の接続文字列 |
   | `CORS_ORIGINS` | `https://kaguera-service.vercel.app`（STEP 4 で確定値に直す） |

4. **Apply** → ビルド完了まで数分待つ
5. 発行された URL（`https://kaguera-api-xxxx.onrender.com`）を控える
6. **動作確認**: ブラウザで `<API_URL>/health` を開き `{"status":"ok"}` が返ればテーブル作成まで成功

> テーブルは起動時に `Base.metadata.create_all` で自動作成されるため、マイグレーション作業は不要。

---

## STEP 3. Vercel — フロントエンドを公開する

1. https://vercel.com に GitHub でサインイン
2. **Add New → Project** → `kaguera_service` を Import
3. **Root Directory を `frontend` に変更する**（重要。リポジトリ直下は backend と frontend の二層構造）
4. Environment Variables に次を登録

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_LAYOUT_API_BASE` | STEP 2 の API URL（末尾スラッシュなし） |
   | `NEXT_PUBLIC_SITE_URL` | Vercel が割り当てる URL（先に `https://kaguera-service.vercel.app` を入れておく） |
   | `ANTHROPIC_API_KEY` | 手元の `frontend/.env.local` の値 |
   | `JINA_API_KEY` | 同上（任意。未設定でも動作する） |

5. **Deploy** → 発行された URL を控える

---

## STEP 4. URL を確定させて繋ぎ込む

STEP 3 で発行された URL が `https://kaguera-service.vercel.app` と異なっていた場合のみ:

1. **Render** → kaguera-api → Environment → `CORS_ORIGINS` を実際の Vercel URL に修正 → 自動再デプロイ
2. **Vercel** → Settings → Environment Variables → `NEXT_PUBLIC_SITE_URL` を実際の URL に修正
3. **Vercel を再デプロイする**（`NEXT_PUBLIC_*` はビルド時に埋め込まれるため、値の変更だけでは反映されない）

---

## STEP 5. 動作確認

1. Vercel の URL を開く → トップページが表示される
2. `/mypage` → ルームプランナーで家具を配置 → **保存・共有**
3. 発行された `/layouts/<publicId>` を**別のブラウザ（またはスマホ）**で開き、レイアウトが復元されることを確認

ここまで通れば、フロント → API → DB の三層がすべて疎通している。

---

## 既知の制約

- **初回アクセスが遅い**: Render Free は 15 分アクセスがないとスリープする。復帰に約 50 秒かかるため、
  README に明記しておく。運用費を 0 円に抑えるための意図的な選択であり、
  常時起動が必要になった時点で有料プラン（$7/月）に切り替えれば解消する。
- **Vercel Hobby は商用利用不可**: ポートフォリオ用途のため問題ない。
