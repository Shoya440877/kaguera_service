output "api_url" {
  description = "ALB 経由の API のベース URL。"
  value       = "http://${aws_lb.main.dns_name}"
}

output "api_docs_url" {
  description = "Swagger UI。デモではここを見せる。"
  value       = "http://${aws_lb.main.dns_name}/docs"
}

output "ecr_repository_url" {
  description = "docker push の宛先。"
  value       = aws_ecr_repository.api.repository_url
}

output "db_endpoint" {
  description = "RDS のエンドポイント(private subnet 内からのみ到達可能)。"
  value       = aws_db_instance.main.endpoint
}

output "log_group" {
  description = "コンテナのログ。起動失敗時はここを見る。"
  value       = aws_cloudwatch_log_group.api.name
}
