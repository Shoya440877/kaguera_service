variable "project" {
  description = "リソース名のプレフィックス。"
  type        = string
  default     = "kaguera"
}

variable "region" {
  description = "デプロイ先リージョン。フロント(Vercel)とDBの距離より、API↔DB間の距離を優先して東京を選ぶ。"
  type        = string
  default     = "ap-northeast-1"
}

variable "vpc_cidr" {
  description = "VPC の CIDR。"
  type        = string
  default     = "10.0.0.0/16"
}

variable "cors_origins" {
  description = "API が CORS で許可するオリジン（カンマ区切り、末尾スラッシュなし）。"
  type        = string
  default     = "https://kaguera.vercel.app"
}

variable "db_instance_class" {
  description = "RDS のインスタンスクラス。t4g(ARM)が同性能帯で最安。"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS のストレージ(GiB)。gp3 の最小は 20。"
  type        = number
  default     = 20
}

variable "task_cpu" {
  description = "Fargate タスクの CPU ユニット(256 = 0.25 vCPU)。"
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Fargate タスクのメモリ(MiB)。"
  type        = number
  default     = 512
}

variable "image_tag" {
  description = "ECR にプッシュしたイメージのタグ。"
  type        = string
  default     = "latest"
}

variable "log_retention_days" {
  description = "CloudWatch Logs の保持期間。デモ環境なので短く保つ。"
  type        = number
  default     = 7
}
