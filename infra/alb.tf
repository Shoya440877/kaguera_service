# ---------------------------------------------------------------------------
# ロードバランサ
#
# HTTP のみ。HTTPS には ACM 証明書が必要で、証明書には所有権を検証できる
# ドメインが要る。デモではドメインを取得していないため 80 番で公開し、
# ALB の DNS 名で直接アクセスする。
#
# この制約により、HTTPS の Vercel フロントから直接この ALB を呼ぶと
# ブラウザが mixed content として遮断する。デモは ALB 経由の Swagger UI を
# 直接開く形で行う。ドメインを取得すれば ACM 証明書(無料)+ リスナーの
# 443 化だけで解消する。
# ---------------------------------------------------------------------------

resource "aws_lb" "main" {
  name               = "${var.project}-alb"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false

  tags = { Name = "${var.project}-alb" }
}

resource "aws_lb_target_group" "api" {
  name        = "${var.project}-api-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # Fargate(awsvpc)はタスクの ENI の IP が直接ターゲットになる

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  # 既定の 300 秒だと destroy と再デプロイが無駄に遅くなる
  deregistration_delay = 30

  tags = { Name = "${var.project}-api-tg" }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}
