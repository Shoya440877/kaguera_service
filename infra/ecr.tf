# ---------------------------------------------------------------------------
# コンテナレジストリ
# ---------------------------------------------------------------------------

resource "aws_ecr_repository" "api" {
  name                 = "${var.project}-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  # イメージが残っているとリポジトリは削除できない。デモ環境では destroy が
  # ここで止まるのを避けるため、中身ごと消す。
  force_delete = true

  tags = { Name = "${var.project}-api" }
}

# 古いイメージを溜めない（ECR は 500MB/月まで無料、それ以降は課金される）
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only the 5 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}
