# infra — KAGUERA バックエンドの AWS 構成（Terraform）

Render で動いているレイアウト保存・共有 API を、**AWS の標準的な構成で建て直したもの**。
アプリのコードには一切手を入れていない（`backend/Dockerfile` をそのまま使う）。

**常時稼働はさせない。** `apply` して確認したら `destroy` する運用を前提に、
そのために必要な設定（後述）を各リソースに入れてある。実際の請求は 1 回あたり数十円で収まる。

---

## 構成

```
                    Internet
                        │
        ┌───────────────▼────────────────┐  VPC 10.0.0.0/16 (ap-northeast-1)
        │                                 │
        │   ┌─────────────────────────┐   │  public subnet × 2AZ
        │   │  ALB            :80     │   │  SG: 0.0.0.0/0 → :80
        │   └────────────┬────────────┘   │
        │                │                 │
        │   ┌────────────▼────────────┐   │  public subnet × 2AZ
        │   │  ECS Fargate    :8000   │   │  SG: ALB のみ → :8000
        │   │  FastAPI ← ECR          │   │
        │   └────────────┬────────────┘   │
        │                │                 │
        │   ┌────────────▼────────────┐   │  private subnet × 2AZ
        │   │  RDS PostgreSQL :5432   │   │  SG: ECS のみ → :5432
        │   └─────────────────────────┘   │  ルートテーブルなし = 外部到達性なし
        └─────────────────────────────────┘

  ECR / IAM ロール × 2 / Secrets Manager / CloudWatch Logs
```

セキュリティグループは CIDR ではなく**ひとつ手前の層の SG を参照**して鎖状に繋いでいる。
RDS は private subnet に置き、ルートテーブルを関連付けていないため VPC 外からは到達できない。

---

## コスト

東京リージョンの概算。**課金は起動している時間だけ**。

| リソース | 時間あたり |
| --- | --- |
| ALB | 約 $0.024 |
| Fargate 0.25 vCPU / 0.5 GB | 約 $0.012 |
| RDS db.t4g.micro + gp3 20GB | 約 $0.024 |
| ECR / Secrets Manager / CloudWatch Logs | ほぼ $0 |
| **合計** | **約 $0.06/時（≒ 9円/時）** |

3 時間で約 30 円、丸 1 日つけっぱなしでも約 220 円。
**apply する前に AWS Budgets でアラートを設定しておくこと。**

---

## 前提

- AWS アカウント（ルートに MFA 設定済み、Budgets のアラート設定済み）
- Terraform >= 1.9 / AWS CLI v2 / Docker
- `aws configure` 済み。確認は `aws sts get-caller-identity`

---

## 手順

### 1. ECR を先に作る

ECS サービスはイメージが存在しないと起動できない。先にレジストリだけ作る。

```bash
cd infra
terraform init
terraform apply -target=aws_ecr_repository.api
```

> `-target` は通常は避けるべきオプションだが、ここでは「イメージの存在」という
> Terraform の外側にある前提条件を満たすための意図的なブートストラップ。
> プロビジョナで隠さず手順として明示している。

### 2. イメージをビルドして push

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=ap-northeast-1
REPO=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/kaguera-api

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com
docker build --platform linux/amd64 -t kaguera-api ../backend
docker tag kaguera-api:latest $REPO:latest
docker push $REPO:latest
```

### 3. 残り全部を作る

```bash
terraform apply
```

RDS の作成に 5〜10 分かかる。完了すると出力に URL が出る。

```bash
terraform output api_docs_url     # Swagger UI
curl "$(terraform output -raw api_url)/health"   # {"status":"ok"}
```

### 4. 壊す

**確認が終わったら必ず実行する。**

```bash
terraform destroy
```

削除後、[Cost Explorer](https://console.aws.amazon.com/cost-management/home) で
消し忘れが無いか確認する。全リソースに `Project = kaguera` タグが付いているので絞り込める。

---

## 設計判断

このデモで意図的に選んだトレードオフ。実運用なら変える箇所も併記する。

### NAT Gateway を置かない

NAT Gateway は 1 台で**月 $32**。上の表の合計が月換算 $43 なので、置いた瞬間に請求の
大半を NAT が占めることになる。代わりに Fargate タスクを public subnet に置き
`assign_public_ip = true` で ECR に到達させ、インバウンドはセキュリティグループで
ALB からのみに制限している。

→ 実運用では private subnet に移し、NAT Gateway か VPC エンドポイント
（ECR / S3 / Secrets Manager / CloudWatch Logs）を使う。

### HTTPS ではなく HTTP

ACM 証明書には所有権を検証できるドメインが必要で、デモ用に取得していない。
そのため ALB は 80 番で公開し、ALB の DNS 名で直接アクセスする。

この結果、**HTTPS の Vercel フロントからこの ALB を直接呼ぶとブラウザが
mixed content として遮断する。** デモは Swagger UI を直接開く形で行う。
ドメインを取れば ACM 証明書は無料なので、リスナーを 443 にするだけで解決する。

### ステートをローカルに置く

単独の作業者が短命な環境を作っては壊すだけなので、S3 + DynamoDB のリモートステートは
オーバースペックと判断した。**ステートには DB のパスワードが平文で入る**ため
`.gitignore` で除外している。

→ 複数人で触るなら S3（バージョニング + 暗号化）+ DynamoDB のロックに移す。

### 接続文字列を丸ごと Secrets Manager に入れる

パスワード単体ではなく、組み立て済みの `postgresql+psycopg://...` を 1 本置いている。
アプリは環境変数を 1 つ読むだけでよく、タスク定義側でホスト名とパスワードを
連結する必要がない。タスク定義には ARN しか載らないので、コンソールにも
平文が残らない。

`recovery_window_in_days = 0` にしてある。既定の 7 日だと destroy 後もシークレット名が
予約され続け、**同じ名前での再 apply が失敗する**ため。

### DB を「壊しやすく」してある

`skip_final_snapshot = true` / `deletion_protection = false` / `backup_retention_period = 0`。
**実運用では 3 つとも逆にする。** ECR も `force_delete = true`（イメージが残っていると
リポジトリを削除できず destroy が止まるため）。

---

## トラブルシューティング

| 症状 | 原因と対処 |
| --- | --- |
| ALB が 503 を返す | タスクがまだ健全化していない。`aws ecs describe-services --cluster kaguera-cluster --services kaguera-api` で確認 |
| タスクが起動と停止を繰り返す | 大半は DB 接続。`terraform output log_group` の CloudWatch Logs を見る |
| `CannotPullContainerError` | 手順 2 の push が済んでいない、またはタグ違い |
| destroy が RDS で止まる | 削除に数分かかる。待つ。`deletion_protection` は既に false |
| apply がシークレット名の重複で失敗 | 以前の destroy が `recovery_window_in_days` 既定値で行われた。`aws secretsmanager delete-secret --secret-id kaguera/database-url --force-delete-without-recovery` |
