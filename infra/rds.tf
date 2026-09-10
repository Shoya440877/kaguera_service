# ---------------------------------------------------------------------------
# データベース
#
# private subnet に置き、ECS のセキュリティグループからのみ 5432 を許可する。
# デモ環境として「壊しやすさ」を優先した設定にしてある（下記コメント参照）。
# ---------------------------------------------------------------------------

resource "random_password" "db" {
  length = 32

  # 英数字のみ。RDS が禁止する文字(/ @ " 空白)を避けつつ、接続 URL に
  # そのまま埋め込めるようにする(パーセントエンコード不要)。32文字の
  # 英数字で十分な強度がある。
  special = false
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${var.project}-db-subnet-group" }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "kaguera"
  username = "kaguera"
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  # --- ここから下はデモ環境向けの設定 ---
  # destroy を確実に通すため。実運用では deletion_protection = true、
  # skip_final_snapshot = false、backup_retention_period >= 7 にする。
  skip_final_snapshot     = true
  deletion_protection     = false
  backup_retention_period = 0
  apply_immediately       = true

  # 追加費用を避ける（Performance Insights は無料枠を超えると課金される）
  performance_insights_enabled = false
  monitoring_interval          = 0

  tags = { Name = "${var.project}-db" }
}

# ---------------------------------------------------------------------------
# 接続情報の受け渡し
#
# パスワード単体ではなく「組み立て済みの接続 URL」を Secrets Manager に置く。
# アプリは DATABASE_URL を 1 本読むだけでよく、タスク定義側でホスト名や
# パスワードを文字列連結する必要がなくなる。
#
# recovery_window_in_days = 0 が重要。既定の 7 日だと destroy 後もシークレット名が
# 予約され続け、同じ名前での再 apply が失敗する。apply/destroy を繰り返す
# 運用ではこれを 0 にしておく必要がある。
# ---------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.project}/database-url"
  description             = "SQLAlchemy connection URL for the Kaguera layout API"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id

  # psycopg v3 を明示する。ドライバ未指定だと SQLAlchemy が psycopg2 を
  # 探しに行くが、backend のイメージには psycopg3 しか入っていない。
  secret_string = format(
    "postgresql+psycopg://%s:%s@%s/%s",
    aws_db_instance.main.username,
    random_password.db.result,
    aws_db_instance.main.endpoint,
    aws_db_instance.main.db_name,
  )
}
