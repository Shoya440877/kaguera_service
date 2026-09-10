# ---------------------------------------------------------------------------
# IAM
#
# 2 つのロールを分ける。
#  - 実行ロール : ECS エージェントが「タスクを起動するため」に使う。
#                 ECR からの pull、CloudWatch へのログ送信、シークレット取得。
#  - タスクロール: コンテナ内のアプリ自身が AWS API を呼ぶときに使う。
#                 このアプリは AWS API を呼ばないので空のまま。将来 S3 等を
#                 使うときはここに権限を足す。役割が違うので最初から分けておく。
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${var.project}-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "task_execution_managed" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# 管理ポリシーには Secrets Manager の読み取りが含まれないため、
# 対象のシークレット 1 本だけに絞って追加する。
data "aws_iam_policy_document" "read_database_url" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.database_url.arn]
  }
}

resource "aws_iam_role_policy" "task_execution_secrets" {
  name   = "${var.project}-read-database-url"
  role   = aws_iam_role.task_execution.id
  policy = data.aws_iam_policy_document.read_database_url.json
}

resource "aws_iam_role" "task" {
  name               = "${var.project}-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

# ---------------------------------------------------------------------------
# ECS
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.project}-api"
  retention_in_days = var.log_retention_days
}

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled" # 有効にすると CloudWatch のカスタムメトリクス課金が乗る
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "${aws_ecr_repository.api.repository_url}:${var.image_tag}"
      essential = true

      portMappings = [{
        containerPort = 8000
        protocol      = "tcp"
      }]

      environment = [
        { name = "CORS_ORIGINS", value = var.cors_origins },
        { name = "PORT", value = "8000" },
      ]

      # 値ではなく ARN を渡す。実際の解決は ECS エージェントが起動時に行うため、
      # 接続文字列がタスク定義にもコンソールにも平文で残らない。
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.database_url.arn
        },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "api"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "api" {
  name            = "${var.project}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.public[*].id
    security_groups = [aws_security_group.ecs.id]

    # NAT Gateway を置いていないため、ECR / Secrets Manager / CloudWatch へは
    # パブリック IP 経由で到達する。インバウンドは SG が ALB だけに絞っている。
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8000
  }

  # 起動直後の /health は DB 接続待ちで落ちることがある。猶予を与えて
  # 健全化前にタスクが殺されるのを防ぐ。
  health_check_grace_period_seconds = 60

  # リスナーより先にサービスを作るとターゲット登録に失敗する
  depends_on = [aws_lb_listener.http]
}
