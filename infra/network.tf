# ---------------------------------------------------------------------------
# ネットワーク
#
# NAT Gateway は使わない。1台あたり月 $32 かかり、数時間だけ立てるデモ環境では
# 請求の大半を占めてしまうため。代わりに Fargate タスクを public subnet に置き、
# パブリック IP 経由で ECR からイメージを取得する。インバウンドはセキュリティ
# グループで ALB からのみに制限しているので、インターネットから直接タスクへは
# 到達できない。本番運用なら private subnet + VPC エンドポイント(または NAT)に
# 置き換える。
# ---------------------------------------------------------------------------

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # ALB と RDS がそれぞれ 2AZ を要求するため、先頭 2 つの AZ を使う。
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true # RDS のエンドポイント名前解決に必要

  tags = { Name = "${var.project}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.project}-igw" }
}

# --- public subnets: ALB と Fargate タスク ---

resource "aws_subnet" "public" {
  count = length(local.azs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "${var.project}-public-${local.azs[count.index]}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.project}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# --- private subnets: RDS 専用。ルートテーブルを付けないので外部到達性はない ---

resource "aws_subnet" "private" {
  count = length(local.azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = local.azs[count.index]

  tags = { Name = "${var.project}-private-${local.azs[count.index]}" }
}

# ---------------------------------------------------------------------------
# セキュリティグループ
#
# 3 層を鎖状に繋ぐ: インターネット → ALB → ECS → RDS。
# 各層は「ひとつ手前の層のセキュリティグループ」だけを許可し、CIDR では開けない。
# ---------------------------------------------------------------------------

resource "aws_security_group" "alb" {
  name        = "${var.project}-alb-sg"
  description = "Allow HTTP from the internet to the load balancer"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.project}-alb-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from anywhere"
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow the ALB to reach its targets"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "ecs" {
  name        = "${var.project}-ecs-sg"
  description = "Allow the ALB to reach the API container"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.project}-ecs-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "ecs_from_alb" {
  security_group_id            = aws_security_group.ecs.id
  description                  = "API port, from the ALB only"
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 8000
  to_port                      = 8000
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "ecs_all" {
  security_group_id = aws_security_group.ecs.id
  description       = "Outbound for ECR image pulls, Secrets Manager and CloudWatch Logs"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "rds" {
  name        = "${var.project}-rds-sg"
  description = "Allow Postgres from the API tasks only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.project}-rds-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_ecs" {
  security_group_id            = aws_security_group.rds.id
  description                  = "Postgres, from the ECS tasks only"
  referenced_security_group_id = aws_security_group.ecs.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}
